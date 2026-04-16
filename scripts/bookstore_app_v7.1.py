# ============================================================
#   Project: 书店记账本
#   Author:  XINYULI (KELLY)
#   Version: 7.1 — 增加实时云端同步（配置驱动，无硬编码）
# ============================================================

import customtkinter as ctk
import threading
import requests  # 用于汇率更新 + 云端同步
# import socket  # 未使用，已删除
import logging
# import signal  # macOS 主线程中可能死锁，已删除
import sys
import platform
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Tuple, List, Set
from pathlib import Path
from collections import defaultdict

# ---- 基础配置 ----

logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(message)s', datefmt='%H:%M')
logger = logging.getLogger("Bookstore")

try:
    from pypinyin import lazy_pinyin
    PINYIN_AVAILABLE = True
except ImportError:
    PINYIN_AVAILABLE = False
    logger.warning("pypinyin未安装，拼音搜索功能不可用")

class VintageConfig:
    APP_NAME = "📚 书店记账本"
    GEOMETRY = "620x920"
    
    # 核心参数
    MARGIN_RATE = 0.15
    CNY_COEFFICIENT = 0.3
    RECOMMEND_DISCOUNT = 0.85
    
    API_URL = "https://open.er-api.com/v6/latest/AUD"
    CURRENCIES = ["JPY", "SGD", "MYR", "HKD", "TWD", "CNY", "AUD", "USD"]
    CATEGORIES = ["小说","漫画", "日本文学", "诗歌", "艺术", "纪实文学", "心灵疗愈", "文化研究", "散文", "摄影", "音乐", "黑胶", "福袋盲盒", "哲学", "历史", "政治", "东南亚文学", "台湾文学", "女性主义", "科普", "社科", "文艺批评", "中国研究", "传记", "建筑", "其他"]
    
    DATA_DIR = Path.home() / ".bookstore_data"
    SALES_FILE = DATA_DIR / "sales_records.json"
    MANAGERS_FILE = DATA_DIR / "managers.json"
    SYNC_CONFIG_FILE = DATA_DIR / "sync_config.json"
    PENDING_SYNC_FILE = DATA_DIR / "pending_syncs.json"
    
    # 🎨 UI配色
    COLORS = {
        # 主色 - 咖啡棕
        "PRIMARY": "#5D4037",
        "PRIMARY_HOVER": "#4E342E",
        "PRIMARY_LIGHT": "#8D6E63",
        
        # 辅助色 - 深绿
        "ACCENT": "#2E7D32",
        "ACCENT_LIGHT": "#43A047",
        
        # 背景 - 纸张色
        "BG_MAIN": "#FFF9F0",
        "BG_CARD": "#FAF0E6",
        "BG_HOVER": "#F5E6D3",
        "BG_DARK": "#EFEBE9",
        
        # 文字
        "TEXT_MAIN": "#3E2723",
        "TEXT_SUB": "#6D4C41",
        "TEXT_HINT": "#8D6E63",
        
        # 功能色
        "SUCCESS": "#2E7D32",
        "WARN": "#D84315",
        "ERROR": "#C62828",
        
        # 边框
        "BORDER": "#D7CCC8",
        "DIVIDER": "#BCAAA4"
    }
    
    # 📝 字体配置（衬线字体）
    FONTS = {
        "TITLE": ("Georgia", 28, "bold"),          # 标题
        "SUBTITLE": ("Georgia", 14),               # 副标题
        "BODY": ("Georgia", 11),                   # 正文
        "LABEL": ("Georgia", 10),                  # 标签
        "BUTTON": ("Georgia", 12, "bold"),         # 按钮
        "NUMBER": ("Courier New", 16, "bold"),     # 数字（等宽）
    }

class RuntimeFixer:
    @staticmethod
    def apply_patches():
        def make_safe_destroy(cls_name):
            def safe_destroy(self):
                if hasattr(self, "_variable") and self._variable is not None:
                    try:
                        self._variable.trace_remove("write", self._trace_callback_name)
                    except Exception: pass
                super(cls_name, self).destroy()
            return safe_destroy
        ctk.CTkSwitch.destroy = make_safe_destroy(ctk.CTkSwitch)
        ctk.CTkOptionMenu.destroy = make_safe_destroy(ctk.CTkOptionMenu)

# ---- 核心计算引擎 ----

class PricingEngine:
    @staticmethod
    def calculate(price: float, currency: str, is_recommend: bool, is_used: bool, is_rental: bool, rates: Dict[str, float]) -> Tuple[float, float]:
        if price <= 0: return 0.0, 0.0
        if is_used or is_rental: return price, price

        def get_rate_to_aud(code):
            if code == "AUD": return 1.0
            return 1.0 / rates.get(code, 1.0)

        base_cost_native = price * (1 + VintageConfig.MARGIN_RATE)
        rate_native_to_aud = get_rate_to_aud(currency)
        base_member_price_aud = base_cost_native * rate_native_to_aud

        rate_aud_to_cny = rates.get("CNY", 1.0)
        val_in_cny = base_member_price_aud * rate_aud_to_cny
        base_standard_price_aud = val_in_cny * VintageConfig.CNY_COEFFICIENT

        if is_recommend:
            final_standard = base_member_price_aud
            final_member = base_member_price_aud * VintageConfig.RECOMMEND_DISCOUNT
        else:
            final_standard = base_standard_price_aud
            final_member = base_member_price_aud

        return final_member, final_standard

# ---- 数据服务 ----

class DataService:
    def __init__(self):
        VintageConfig.DATA_DIR.mkdir(exist_ok=True)
        self._ensure_files()
    
    def _ensure_files(self):
        if not VintageConfig.SALES_FILE.exists():
            VintageConfig.SALES_FILE.write_text("[]")
        if not VintageConfig.MANAGERS_FILE.exists():
            VintageConfig.MANAGERS_FILE.write_text('["Kelly"]')
    
    def save_sale(self, books: List[Dict], total_member: float, total_standard: float, sale_type: str = "member", actual_revenue: float = None) -> Dict | None:
        """保存销售记录到本地，返回记录字典（供云端同步使用），失败返回 None"""
        try:
            records = json.loads(VintageConfig.SALES_FILE.read_text())
            if actual_revenue is None:
                actual_revenue = total_member
            record = {
                "id": datetime.now().strftime("%Y%m%d_%H%M%S"),
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "books": books,
                "sale_type": sale_type,
                "total_member_price": round(total_member, 2),
                "total_standard_price": round(total_standard, 2),
                "actual_revenue": round(actual_revenue, 2)
            }
            records.append(record)
            VintageConfig.SALES_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2))
            return record
        except Exception as e:
            logger.error(f"保存失败: {e}")
            return None
    
    def get_all_sales(self) -> List[Dict]:
        try:
            return json.loads(VintageConfig.SALES_FILE.read_text())
        except:
            return []
    
    def get_managers(self) -> List[str]:
        try:
            return json.loads(VintageConfig.MANAGERS_FILE.read_text())
        except:
            return ["Kelly"]
    
    def add_manager(self, name: str):
        if not name.strip(): return
        managers = self.get_managers()
        if name not in managers:
            managers.append(name)
            VintageConfig.MANAGERS_FILE.write_text(json.dumps(managers, ensure_ascii=False, indent=2))
    
    def delete_sale(self, record_id: str):
        """删除指定ID的销售记录"""
        try:
            records = json.loads(VintageConfig.SALES_FILE.read_text())
            original_count = len(records)
            records = [r for r in records if r.get("id") != record_id]
            
            if len(records) < original_count:
                VintageConfig.SALES_FILE.write_text(json.dumps(records, ensure_ascii=False, indent=2))
                logger.info(f"已删除销售记录: {record_id}")
                return True
            else:
                logger.warning(f"未找到销售记录: {record_id}")
                return False
        except Exception as e:
            logger.error(f"删除记录失败: {e}")
            return False
    
    def clear_all_sales(self):
        """清除所有销售记录"""
        try:
            VintageConfig.SALES_FILE.write_text("[]")
            logger.info("已清除所有销售记录")
            return True
        except Exception as e:
            logger.error(f"清除记录失败: {e}")
            return False


class CloudSyncService:
    """云端同步服务 — 配置文件驱动，支持离线重试，零硬编码
    
    配置文件位置: ~/.bookstore_data/sync_config.json
    示例内容:
    {
        "enabled": true,
        "api_url": "https://your-domain.vercel.app/api/sync-sales",
        "api_token": "your-secret-token"
    }
    """
    
    _DEFAULT_CONFIG = {
        "enabled": False,
        "api_url": "",
        "api_token": ""
    }
    
    def __init__(self):
        self._config = self._load_config()
        if self.enabled:
            logger.info("☁️ 云端同步已启用")
        else:
            logger.info("☁️ 云端同步未启用（编辑 sync_config.json 开启）")
    
    # ---- 公开接口 ----
    
    @property
    def enabled(self) -> bool:
        cfg = self._config
        return cfg.get("enabled", False) and bool(cfg.get("api_url"))
    
    def sync(self, record: Dict):
        """后台同步单条记录（fire-and-forget，不阻塞UI）"""
        if not self.enabled:
            return
        threading.Thread(target=self._do_sync, args=(record,), daemon=True).start()
    
    def void(self, record_id: str, reason: str = ""):
        """后台通知云端作废一条记录（fire-and-forget）"""
        if not self.enabled:
            return
        threading.Thread(target=self._do_void, args=(record_id, reason), daemon=True).start()
    
    def retry_pending(self):
        """后台重试所有失败记录（启动时调用一次即可）"""
        if not self.enabled:
            return
        threading.Thread(target=self._do_retry, daemon=True).start()
    
    # ---- 内部实现 ----
    
    def _load_config(self) -> Dict:
        """读取配置文件，不存在则生成模板"""
        config_path = VintageConfig.SYNC_CONFIG_FILE
        if not config_path.exists():
            self._write_template(config_path)
            return self._DEFAULT_CONFIG.copy()
        try:
            return json.loads(config_path.read_text())
        except Exception as e:
            logger.warning(f"读取同步配置失败: {e}")
            return self._DEFAULT_CONFIG.copy()
    
    def _write_template(self, path: Path):
        """首次运行时生成配置模板文件"""
        template = {
            "_注释": "将 enabled 改为 true 并填写 api_url / api_token 即可开启云端同步",
            **self._DEFAULT_CONFIG
        }
        try:
            path.write_text(json.dumps(template, ensure_ascii=False, indent=2))
            logger.info(f"已生成同步配置模板: {path}")
        except Exception as e:
            logger.warning(f"生成配置模板失败: {e}")
    
    def _request(self, records: List[Dict], timeout: int = 10) -> bool:
        """发送同步请求，成功返回 True"""
        url = self._config.get("api_url", "")
        token = self._config.get("api_token", "")
        resp = requests.post(
            url,
            json={"sales": records},
            headers={"x-admin-token": token, "Content-Type": "application/json"},
            timeout=timeout
        )
        resp.raise_for_status()
        result = resp.json()
        inserted = result.get("inserted", 0)
        skipped = result.get("skipped", 0)
        logger.info(f"☁️ 同步完成: {inserted} 条入库, {skipped} 条跳过")
        return True
    
    def _do_sync(self, record: Dict):
        """同步单条记录，失败则加入待重试队列"""
        try:
            self._request([record])
        except Exception as e:
            logger.warning(f"☁️ 同步失败（已加入重试队列）: {e}")
            self._enqueue_pending(record)
    
    def _do_retry(self):
        """批量重试队列中的失败记录"""
        pending = self._load_pending()
        if not pending:
            return
        logger.info(f"☁️ 正在重试 {len(pending)} 条待同步记录...")
        try:
            self._request(pending, timeout=20)
            self._clear_pending()
        except Exception as e:
            logger.warning(f"☁️ 重试失败，下次启动再试: {e}")
    
    def _do_void(self, record_id: str, reason: str):
        """通知云端作废记录"""
        url = self._config.get("api_url", "")
        token = self._config.get("api_token", "")
        # void-sale endpoint is sibling to sync-sales
        void_url = url.replace("/sync-sales", "/void-sale")
        try:
            resp = requests.post(
                void_url,
                json={"saleId": record_id, "source": "desktop_app", "reason": reason},
                headers={"x-admin-token": token, "Content-Type": "application/json"},
                timeout=10
            )
            if resp.ok:
                logger.info(f"☁️ 云端已作废: {record_id}")
            else:
                logger.warning(f"☁️ 云端作废失败: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.warning(f"☁️ 云端作废请求失败: {e}")
    
    # ---- 待重试队列（JSON 文件） ----
    
    def _enqueue_pending(self, record: Dict):
        pending = self._load_pending()
        existing_ids = {r.get("id") for r in pending}
        if record.get("id") not in existing_ids:
            pending.append(record)
        try:
            VintageConfig.PENDING_SYNC_FILE.write_text(
                json.dumps(pending, ensure_ascii=False, indent=2)
            )
        except Exception as e:
            logger.error(f"保存待同步队列失败: {e}")
    
    def _load_pending(self) -> List[Dict]:
        try:
            if VintageConfig.PENDING_SYNC_FILE.exists():
                return json.loads(VintageConfig.PENDING_SYNC_FILE.read_text())
        except Exception:
            pass
        return []
    
    def _clear_pending(self):
        try:
            if VintageConfig.PENDING_SYNC_FILE.exists():
                VintageConfig.PENDING_SYNC_FILE.write_text("[]")
        except Exception:
            pass


class ExchangeRateService:
    def __init__(self):
        self._rates = {}
        self._last_update = "待更新"
        self._lock = threading.Lock()

    @property
    def rates(self):
        with self._lock: return self._rates.copy()
    
    @property
    def last_update(self):
        with self._lock: return self._last_update
    
    def has_rates(self) -> bool:
        """检查是否已有汇率数据"""
        with self._lock:
            return len(self._rates) > 0 and "CNY" in self._rates

    def fetch_async(self, on_done, ctx):
        def task():
            try:
                # 直接请求API，不单独检测网络（避免防火墙阻止）
                resp = requests.get(VintageConfig.API_URL, timeout=10)
                resp.raise_for_status()  # 检查HTTP状态码
                
                data = resp.json()
                if data.get("result") != "success":
                    raise ValueError(f"API返回错误: {data.get('error-type', 'unknown')}")
                
                with self._lock:
                    self._rates = data["rates"]
                    self._last_update = datetime.now().strftime("%H:%M")
                
                logger.info(f"汇率更新成功，共{len(self._rates)}个货币")
                ctx.after(0, lambda: on_done(True, "汇率已更新"))
            except requests.exceptions.Timeout:
                logger.warning("汇率更新超时")
                ctx.after(0, lambda: on_done(False, "连接超时"))
            except requests.exceptions.ConnectionError:
                logger.warning("无法连接到汇率服务器")
                ctx.after(0, lambda: on_done(False, "网络错误"))
            except Exception as e:
                logger.error(f"汇率更新失败: {e}")
                ctx.after(0, lambda: on_done(False, "网络错误"))
                ctx.after(0, lambda: on_done(False, "网络错误"))
        threading.Thread(target=task, daemon=True).start()

# ---- UI组件 ----

class VintageButton(ctk.CTkButton):
    """复古风格按钮"""
    def __init__(self, master, text, **kwargs):
        defaults = {
            "font": VintageConfig.FONTS["BUTTON"],
            "fg_color": VintageConfig.COLORS["PRIMARY"],
            "hover_color": VintageConfig.COLORS["PRIMARY_HOVER"],
            "text_color": VintageConfig.COLORS["BG_MAIN"],
            "corner_radius": 8,
            "border_width": 0,
            "height": 40
        }
        defaults.update(kwargs)
        super().__init__(master, text=text, **defaults)

class VintageLabel(ctk.CTkLabel):
    """复古风格标签"""
    def __init__(self, master, text, style="body", **kwargs):
        font_map = {
            "title": VintageConfig.FONTS["TITLE"],
            "subtitle": VintageConfig.FONTS["SUBTITLE"],
            "body": VintageConfig.FONTS["BODY"],
            "label": VintageConfig.FONTS["LABEL"],
            "number": VintageConfig.FONTS["NUMBER"]
        }
        defaults = {
            "font": font_map.get(style, VintageConfig.FONTS["BODY"]),
            "text_color": VintageConfig.COLORS["TEXT_MAIN"]
        }
        defaults.update(kwargs)
        super().__init__(master, text=text, **defaults)

class Divider(ctk.CTkFrame):
    """装饰性分隔线"""
    def __init__(self, master, **kwargs):
        defaults = {
            "height": 1,
            "fg_color": VintageConfig.COLORS["DIVIDER"]
        }
        defaults.update(kwargs)
        super().__init__(master, **defaults)

class BookCard(ctk.CTkFrame):
    """书籍卡片 - 复古风格"""
    def __init__(self, parent, on_change, on_delete, data_service, default_manager, default_price="", is_used=False, is_rental=False):
        super().__init__(
            parent, 
            fg_color=VintageConfig.COLORS["BG_CARD"],
            corner_radius=12,
            border_width=2,
            border_color=VintageConfig.COLORS["BORDER"]
        )
        self.on_change = on_change
        self._is_used = is_used
        self._is_rental = is_rental
        self.data_service = data_service
        self.pack(fill="x", pady=8, padx=4)
        
        # 内容区
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=15, pady=12)
        
        # === 行1：书名输入 ===
        self.title_var = ctk.StringVar()
        self.title_var.trace_add("write", self._on_title_change)
        
        title_frame = ctk.CTkFrame(content, fg_color="transparent")
        title_frame.pack(fill="x", pady=(0, 2))
        
        VintageLabel(title_frame, "📖", style="body").pack(side="left", padx=(0, 5))
        
        # 书名输入框
        self.title_entry = ctk.CTkEntry(
            title_frame,
            textvariable=self.title_var,
            placeholder_text="输入书名",
            font=VintageConfig.FONTS["BODY"],
            fg_color=VintageConfig.COLORS["BG_MAIN"],
            border_color=VintageConfig.COLORS["BORDER"],
            border_width=1,
            height=32
        )
        self.title_entry.pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        # 字数统计标签（放在title_frame右侧，与输入框同行）
        self.char_count_label = VintageLabel(
            title_frame,
            "",
            style="label",
            text_color=VintageConfig.COLORS["TEXT_HINT"],
            width=80
        )
        self.char_count_label.pack(side="left", padx=(5, 0))
        
        # === 行2：分类 + 店长 ===
        meta_frame = ctk.CTkFrame(content, fg_color="transparent")
        meta_frame.pack(fill="x", pady=(0, 8))
        
        # 分类
        self.category_var = ctk.StringVar(value=VintageConfig.CATEGORIES[0])
        ctk.CTkOptionMenu(
            meta_frame,
            variable=self.category_var,
            values=VintageConfig.CATEGORIES,
            width=100,
            height=28,
            font=VintageConfig.FONTS["LABEL"],
            fg_color=VintageConfig.COLORS["BG_MAIN"],
            button_color=VintageConfig.COLORS["PRIMARY_LIGHT"],
            button_hover_color=VintageConfig.COLORS["PRIMARY"],
            text_color=VintageConfig.COLORS["TEXT_MAIN"],
            dropdown_font=VintageConfig.FONTS["LABEL"],
            command=self._notify
        ).pack(side="left", padx=(0, 10))
        
        # 店长
        managers = data_service.get_managers()
        self.manager_var = ctk.StringVar(value=default_manager)
        ctk.CTkComboBox(
            meta_frame,
            variable=self.manager_var,
            values=managers,
            width=120,
            height=28,
            font=VintageConfig.FONTS["LABEL"],
            fg_color=VintageConfig.COLORS["BG_MAIN"],
            border_color=VintageConfig.COLORS["BORDER"],
            button_color=VintageConfig.COLORS["PRIMARY_LIGHT"],
            button_hover_color=VintageConfig.COLORS["PRIMARY"],
            text_color=VintageConfig.COLORS["TEXT_MAIN"],
            dropdown_font=VintageConfig.FONTS["LABEL"],
            command=self._notify
        ).pack(side="left")
        
        # === 行3：定价信息 ===
        price_frame = ctk.CTkFrame(content, fg_color="transparent")
        price_frame.pack(fill="x")
        
        # 货币
        if is_rental:
            self.curr_var = ctk.StringVar(value="AUD")
        else:
            self.curr_var = ctk.StringVar(value="AUD" if is_used else "JPY")
        
        ctk.CTkOptionMenu(
            price_frame,
            variable=self.curr_var,
            values=VintageConfig.CURRENCIES,
            width=70,
            height=32,
            font=VintageConfig.FONTS["LABEL"],
            fg_color=VintageConfig.COLORS["BG_MAIN"],
            button_color=VintageConfig.COLORS["PRIMARY_LIGHT"],
            text_color=VintageConfig.COLORS["TEXT_MAIN"],
            state="disabled" if is_rental else "normal",
            command=self._notify
        ).pack(side="left", padx=(0, 8))
        
        # 价格
        self.price_var = ctk.StringVar(value=str(default_price))
        self.price_var.trace_add("write", self._on_price_change)
        
        # 注册验证函数：只允许数字和小数点
        vcmd = (self.register(self._validate_price), '%P')
        
        self.price_entry = ctk.CTkEntry(
            price_frame,
            textvariable=self.price_var,
            placeholder_text="0.00",
            width=90,
            height=32,
            font=VintageConfig.FONTS["NUMBER"],
            fg_color=VintageConfig.COLORS["BG_MAIN"],
            border_color=VintageConfig.COLORS["BORDER"],
            state="disabled",
            validate="key",
            validatecommand=vcmd
        )
        self.price_entry.pack(side="left", padx=(0, 10))
        
        # 标签/开关
        self.rec_var = ctk.BooleanVar(value=False)
        if is_rental:
            ctk.CTkLabel(
                price_frame,
                text="🏛️ 书阁",
                font=VintageConfig.FONTS["LABEL"],
                text_color=VintageConfig.COLORS["ACCENT"]
            ).pack(side="left", padx=5)
        elif is_used:
            ctk.CTkLabel(
                price_frame,
                text="♻️ 二手",
                font=VintageConfig.FONTS["LABEL"],
                text_color=VintageConfig.COLORS["WARN"]
            ).pack(side="left", padx=5)
        else:
            ctk.CTkSwitch(
                price_frame,
                text="⭐推荐",
                variable=self.rec_var,
                width=70,
                height=24,
                font=VintageConfig.FONTS["LABEL"],
                progress_color=VintageConfig.COLORS["ACCENT"],
                button_color=VintageConfig.COLORS["BG_MAIN"],
                button_hover_color=VintageConfig.COLORS["BG_HOVER"],
                text_color=VintageConfig.COLORS["TEXT_SUB"],
                command=self._notify
            ).pack(side="left", padx=5)
        
        # 删除按钮
        self.on_delete_callback = on_delete  # 保存删除回调
        ctk.CTkButton(
            price_frame,
            text="✕",
            width=32,
            height=32,
            font=("Georgia", 14),
            fg_color="transparent",
            text_color=VintageConfig.COLORS["TEXT_HINT"],
            hover_color=VintageConfig.COLORS["BG_HOVER"],
            command=self._confirm_delete
        ).pack(side="right")
    
    def _confirm_delete(self):
        """删除前确认"""
        title = self.title_var.get().strip()
        # 如果没有输入内容，直接删除
        if not title:
            self.on_delete_callback(self)
            return
        
        # 如果有内容，弹出确认对话框
        dialog = ctk.CTkToplevel(self.winfo_toplevel())
        dialog.title("确认删除")
        dialog.geometry("320x160")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 160
        y = (dialog.winfo_screenheight() // 2) - 80
        dialog.geometry(f"320x160+{x}+{y}")
        
        dialog.transient(self.winfo_toplevel())
        dialog.grab_set()
        
        VintageLabel(dialog, "确认删除这本书？", style="subtitle").pack(pady=(20, 5))
        
        # 显示书名（限制长度）
        display_title = title if len(title) <= 20 else title[:20] + "..."
        VintageLabel(dialog, f"《{display_title}》", style="body", 
                    text_color=VintageConfig.COLORS["WARN"]).pack(pady=(0, 20))
        
        btn_row = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_row.pack()
        
        VintageButton(btn_row, text="取消", width=100,
                     fg_color="transparent",
                     text_color=VintageConfig.COLORS["PRIMARY"],
                     border_width=2,
                     border_color=VintageConfig.COLORS["BORDER"],
                     hover_color=VintageConfig.COLORS["BG_HOVER"],
                     command=dialog.destroy).pack(side="left", padx=5)
        
        def do_delete():
            dialog.destroy()
            self.on_delete_callback(self)
        
        VintageButton(btn_row, text="删除", width=100,
                     fg_color=VintageConfig.COLORS["ERROR"],
                     hover_color=VintageConfig.COLORS["WARN"],
                     command=do_delete).pack(side="left", padx=5)
    
    def _on_title_change(self, *args):
        title = self.title_var.get()
        clean_title = title.strip()
        
        # 计算字数（不含空格）
        char_count = len(re.sub(r'\s', '', clean_title))
        
        # 更新字数统计标签
        if char_count > 0:
            if char_count > 50:
                self.char_count_label.configure(
                    text=f"⚠️ {char_count}/50字（过长）",
                    text_color=VintageConfig.COLORS["WARN"]
                )
                self.title_entry.configure(border_color=VintageConfig.COLORS["WARN"])
            else:
                self.char_count_label.configure(
                    text=f"{char_count}字",
                    text_color=VintageConfig.COLORS["TEXT_HINT"]
                )
                self.title_entry.configure(border_color=VintageConfig.COLORS["ACCENT"], border_width=2)
        else:
            self.char_count_label.configure(text="")
            self.title_entry.configure(border_width=1, border_color=VintageConfig.COLORS["BORDER"])
        
        # 价格输入框状态控制
        if clean_title:
            self.price_entry.configure(state="normal", border_color=VintageConfig.COLORS["ACCENT"], border_width=2)
        else:
            self.price_entry.configure(state="disabled", border_width=1)
        
        self._notify()
    
    def _validate_price(self, value):
        """验证价格输入：只允许数字和小数点"""
        if value == "":
            return True
        # 允许：纯数字、一个小数点、小数点开头的数字
        if re.match(r'^\d*\.?\d*$', value):
            return True
        return False
    
    def _on_price_change(self, *args):
        """价格变化时的回调"""
        self._notify()
    
    def _notify(self, *args):
        self.on_change()
    
    def get_data(self):
        try: p = float(self.price_var.get())
        except: p = 0.0
        return {
            "title": self.title_var.get().strip(),
            "category": self.category_var.get(),
            "manager": self.manager_var.get(),
            "price": p,
            "currency": self.curr_var.get(),
            "is_recommend": self.rec_var.get(),
            "is_used": self._is_used,
            "is_rental": self._is_rental
        }
    
    def validate(self) -> Tuple[bool, str]:
        data = self.get_data()
        if not data["title"]: return False, "请输入书名"
        if not data["manager"]: return False, "请选择店长"
        if data["price"] <= 0: return False, "请输入有效价格"
        return True, ""
    
    def destroy(self):
        # 清理trace回调，防止widget销毁后的回调错误
        try:
            self.title_var.trace_remove("write", self.title_var.trace_info()[0][1])
        except:
            pass
        try:
            self.price_var.trace_remove("write", self.price_var.trace_info()[0][1])
        except:
            pass
        super().destroy()

class PriceDisplay(ctk.CTkFrame):
    """价格显示板 - 复古风格"""
    def __init__(self, master):
        super().__init__(
            master,
            fg_color=VintageConfig.COLORS["BG_CARD"],
            corner_radius=12,
            border_width=2,
            border_color=VintageConfig.COLORS["BORDER"],
            height=100
        )
        self.pack_propagate(False)
        
        # 左侧 - 会员价
        left = ctk.CTkFrame(self, fg_color="transparent")
        left.pack(side="left", fill="both", expand=True, padx=20, pady=15)
        
        VintageLabel(left, "会员价格", style="label", text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(anchor="w")
        self.lbl_member = VintageLabel(left, "$0.00", style="number", text_color=VintageConfig.COLORS["PRIMARY"])
        self.lbl_member.pack(anchor="w")
        
        # 分隔线
        Divider(self, width=2, height=60).pack(side="left", pady=20)
        
        # 右侧 - 非会员价
        right = ctk.CTkFrame(self, fg_color="transparent")
        right.pack(side="right", fill="both", expand=True, padx=20, pady=15)
        
        VintageLabel(right, "标准价格", style="label", text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(anchor="e")
        self.lbl_standard = VintageLabel(right, "$0.00", style="body", text_color=VintageConfig.COLORS["TEXT_SUB"])
        self.lbl_standard.pack(anchor="e")
    
    def update(self, member, standard):
        self.lbl_member.configure(text=f"${member:,.2f}")
        self.lbl_standard.configure(text=f"${standard:,.2f}")

# ---- 对话框和窗口 ----

class ExportOptionsDialog(ctk.CTkToplevel):
    """Excel导出选项对话框 - 复古风格"""
    def __init__(self, parent, total_records):
        super().__init__(parent)
        self.title("导出销售数据")
        self.geometry("420x380")
        self.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        self.resizable(False, False)
        
        self.result = None
        
        # 居中
        self.update_idletasks()
        x = (self.winfo_screenwidth() // 2) - 210
        y = (self.winfo_screenheight() // 2) - 190
        self.geometry(f"420x380+{x}+{y}")
        
        self.transient(parent)
        self.grab_set()
        
        # 内容
        content = ctk.CTkFrame(self, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=25, pady=20)
        
        VintageLabel(content, "📥 导出销售数据", style="title").pack(pady=(0, 20))
        
        # 导出范围
        VintageLabel(content, "导出范围", style="subheading", anchor="w").pack(fill="x", pady=(0, 10))
        
        self.range_var = ctk.StringVar(value="all")
        
        range_frame = ctk.CTkFrame(content, fg_color=VintageConfig.COLORS["BG_CARD"], 
                                  corner_radius=12, border_width=2, border_color=VintageConfig.COLORS["BORDER"])
        range_frame.pack(fill="x", pady=(0, 15))
        
        options = [
            (f"● 全部记录 ({total_records}条)", "all"),
            ("○ 最近7天", "7days"),
            ("○ 最近30天", "30days"),
            ("○ 本月", "thismonth")
        ]
        
        for text, value in options:
            ctk.CTkRadioButton(
                range_frame,
                text=text,
                variable=self.range_var,
                value=value,
                font=VintageConfig.FONTS["BODY"],
                fg_color=VintageConfig.COLORS["ACCENT"],
                hover_color=VintageConfig.COLORS["ACCENT_LIGHT"],
                text_color=VintageConfig.COLORS["TEXT_MAIN"]
            ).pack(anchor="w", padx=15, pady=6)
        
        # 文件名
        VintageLabel(content, "文件名", style="subheading", anchor="w").pack(fill="x", pady=(10, 10))
        
        filename_frame = ctk.CTkFrame(content, fg_color="transparent")
        filename_frame.pack(fill="x")
        
        default_name = f"销售报表_{datetime.now().strftime('%Y%m%d')}"
        self.filename_var = ctk.StringVar(value=default_name)
        
        ctk.CTkEntry(
            filename_frame,
            textvariable=self.filename_var,
            height=40,
            font=VintageConfig.FONTS["BODY"],
            fg_color=VintageConfig.COLORS["BG_CARD"],
            border_color=VintageConfig.COLORS["BORDER"],
            border_width=2
        ).pack(side="left", fill="x", expand=True, padx=(0, 5))
        
        VintageLabel(filename_frame, ".xlsx", style="body").pack(side="left")
        
        # 按钮
        btn_row = ctk.CTkFrame(content, fg_color="transparent")
        btn_row.pack(pady=(25, 0))
        
        VintageButton(btn_row, text="取消", width=140, 
                     fg_color="transparent",
                     text_color=VintageConfig.COLORS["PRIMARY"],
                     border_width=2,
                     border_color=VintageConfig.COLORS["BORDER"],
                     hover_color=VintageConfig.COLORS["BG_HOVER"],
                     command=self._cancel).pack(side="left", padx=5)
        
        VintageButton(btn_row, text="确认导出", width=140,
                     fg_color=VintageConfig.COLORS["ACCENT"],
                     hover_color=VintageConfig.COLORS["ACCENT_LIGHT"],
                     command=self._confirm).pack(side="left", padx=5)
        
        self.bind("<Return>", lambda e: self._confirm())
        self.bind("<Escape>", lambda e: self._cancel())
    
    def _confirm(self):
        self.result = {
            "range": self.range_var.get(),
            "filename": self.filename_var.get().strip()
        }
        self.destroy()
    
    def _cancel(self):
        self.result = None
        self.destroy()

class SalesHistoryWindow(ctk.CTkToplevel):
    """销售历史窗口 - 复古风格"""
    def __init__(self, parent, data_service):
        super().__init__(parent)
        self.data_service = data_service
        self.all_records = data_service.get_all_sales()
        
        self.title("📜 销售记录")
        self.geometry("900x700")
        self.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        # 居中
        self.update_idletasks()
        x = (self.winfo_screenwidth() // 2) - 450
        y = (self.winfo_screenheight() // 2) - 350
        self.geometry(f"900x700+{x}+{y}")
        
        self._build_ui()
        self._display_records(self.all_records)
        self._display_stats(self.all_records)
    
    def _build_ui(self):
        # 顶栏
        header = ctk.CTkFrame(self, fg_color=VintageConfig.COLORS["BG_CARD"], height=70)
        header.pack(fill="x")
        header.pack_propagate(False)
        
        header_content = ctk.CTkFrame(header, fg_color="transparent")
        header_content.pack(fill="both", expand=True, padx=20, pady=15)
        
        VintageLabel(header_content, "📜 销售记录", style="heading").pack(side="left")
        
        # 搜索和筛选栏
        search_frame = ctk.CTkFrame(header_content, fg_color="transparent")
        search_frame.pack(side="right")
        
        # 购买类型筛选
        self.filter_var = ctk.StringVar(value="all")
        self.filter_var.trace_add("write", self._on_filter_change)
        
        filter_menu = ctk.CTkOptionMenu(
            search_frame,
            variable=self.filter_var,
            values=["全部", "会员购买", "非会员购买"],
            width=120,
            height=35,
            font=VintageConfig.FONTS["BODY"],
            fg_color=VintageConfig.COLORS["PRIMARY"],
            button_color=VintageConfig.COLORS["PRIMARY_LIGHT"],
            button_hover_color=VintageConfig.COLORS["PRIMARY_HOVER"],
            dropdown_fg_color=VintageConfig.COLORS["BG_CARD"]
        )
        filter_menu.pack(side="left", padx=5)
        
        # 搜索框
        self.search_var = ctk.StringVar()
        self.search_var.trace_add("write", self._on_search)
        
        ctk.CTkEntry(
            search_frame,
            textvariable=self.search_var,
            placeholder_text="🔍 搜索书名或店长",
            width=200,
            height=35,
            font=VintageConfig.FONTS["BODY"],
            fg_color=VintageConfig.COLORS["BG_MAIN"],
            border_color=VintageConfig.COLORS["BORDER"]
        ).pack(side="left", padx=5)
        
        VintageButton(
            search_frame,
            text="📥 导出Excel",
            width=120,
            command=self._export_excel
        ).pack(side="left", padx=5)
        
        VintageButton(
            search_frame,
            text="🗑️ 清除",
            width=80,
            fg_color=VintageConfig.COLORS["ERROR"],
            hover_color=VintageConfig.COLORS["WARN"],
            command=self._clear_all_data
        ).pack(side="left")
        
        Divider(self).pack(fill="x")
        
        # 主内容区
        main = ctk.CTkFrame(self, fg_color="transparent")
        main.pack(fill="both", expand=True, padx=15, pady=15)
        
        # 左侧 - 记录列表
        left = ctk.CTkFrame(main, fg_color="transparent")
        left.pack(side="left", fill="both", expand=True, padx=(0, 10))
        
        VintageLabel(left, "· 销售明细 ·", style="subheading").pack(pady=(0, 10))
        
        self.scroll = ctk.CTkScrollableFrame(
            left,
            fg_color="transparent",
            scrollbar_button_color=VintageConfig.COLORS["PRIMARY_LIGHT"]
        )
        self.scroll.pack(fill="both", expand=True)
        
        # 右侧 - 统计
        right = ctk.CTkFrame(main, fg_color="transparent", width=280)
        right.pack(side="right", fill="y")
        right.pack_propagate(False)
        
        VintageLabel(right, "· 数据统计 ·", style="subheading").pack(pady=(0, 10))
        
        self.stats_container = ctk.CTkFrame(right, fg_color="transparent")
        self.stats_container.pack(fill="both", expand=True)
    
    def _display_records(self, records):
        for widget in self.scroll.winfo_children():
            widget.destroy()
        
        if not records:
            VintageLabel(self.scroll, "暂无记录", style="label",
                        text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(pady=50)
            return
        
        for record in reversed(records):
            self._create_record_card(record)
    
    def _create_record_card(self, record):
        card = ctk.CTkFrame(
            self.scroll,
            fg_color=VintageConfig.COLORS["BG_CARD"],
            corner_radius=12,
            border_width=2,
            border_color=VintageConfig.COLORS["BORDER"]
        )
        card.pack(fill="x", pady=5)
        
        content = ctk.CTkFrame(card, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=15, pady=12)
        
        # 头部 - 时间 + 购买类型 + 删除按钮
        header_row = ctk.CTkFrame(content, fg_color="transparent")
        header_row.pack(fill="x", pady=(0, 8))
        
        VintageLabel(header_row, record["timestamp"], style="body_bold",
                    text_color=VintageConfig.COLORS["PRIMARY"]).pack(side="left")
        
        # 删除按钮
        delete_btn = ctk.CTkButton(
            header_row,
            text="✕",
            width=28,
            height=28,
            font=("Georgia", 12),
            fg_color="transparent",
            text_color=VintageConfig.COLORS["TEXT_HINT"],
            hover_color=VintageConfig.COLORS["BG_HOVER"],
            command=lambda: self._confirm_delete_record(record)
        )
        delete_btn.pack(side="right", padx=(5, 0))
        
        # 购买类型标签
        sale_type = record.get("sale_type", "member")
        type_label = "🎫 会员" if sale_type == "member" else "👥 非会员"
        type_color = VintageConfig.COLORS["ACCENT"] if sale_type == "member" else VintageConfig.COLORS["TEXT_SUB"]
        
        VintageLabel(header_row, type_label, style="small",
                    text_color=type_color).pack(side="right", padx=(0, 5))
        
        # 书籍列表
        for book in record["books"]:
            book_row = ctk.CTkFrame(content, fg_color="transparent")
            book_row.pack(fill="x", pady=2)
            
            # 左侧 - 书名+分类
            title = f"📖 {book['title']}"
            if book.get("category"):
                title += f" [{book['category']}]"
            VintageLabel(book_row, title, style="body").pack(side="left")
            
            # 右侧 - 店长+价格
            right_info = ctk.CTkFrame(book_row, fg_color="transparent")
            right_info.pack(side="right")
            
            VintageLabel(right_info, f"👤 {book.get('manager', '?')}", style="small",
                        text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(side="left", padx=(0, 10))
            
            price_text = f"${book['final_price']:.2f}"
            if book.get("is_recommend"):
                price_text += " ⭐"
            VintageLabel(right_info, price_text, style="body",
                        text_color=VintageConfig.COLORS["PRIMARY"]).pack(side="left")
        
        # 底部 - 总价
        Divider(content, height=1).pack(fill="x", pady=(8, 8))
        
        footer = ctk.CTkFrame(content, fg_color="transparent")
        footer.pack(fill="x")
        
        # 显示实际收入
        actual_revenue = record.get("actual_revenue", record["total_member_price"])
        VintageLabel(footer, f"实际收入: ${actual_revenue:.2f}",
                    style="body_bold",
                    text_color=VintageConfig.COLORS["ACCENT"]).pack(side="left")
        
        # 右侧显示会员/标准价格对比
        if record.get("sale_type") != "member":
            VintageLabel(footer, f"（会员价: ${record['total_member_price']:.2f}）",
                        style="small",
                        text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(side="right")
    
    def _confirm_delete_record(self, record):
        """确认删除单条销售记录"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("⚠️ 确认删除")
        dialog.geometry("400x280")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 200
        y = (dialog.winfo_screenheight() // 2) - 140
        dialog.geometry(f"400x280+{x}+{y}")
        
        dialog.transient(self)
        dialog.grab_set()
        
        content = ctk.CTkFrame(dialog, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=20, pady=20)
        
        VintageLabel(content, "⚠️", style="title", text_color=VintageConfig.COLORS["WARN"]).pack(pady=(0, 10))
        VintageLabel(content, "确认删除这条销售记录？", style="subtitle").pack(pady=(0, 15))
        
        # 显示记录摘要
        info_frame = ctk.CTkFrame(content, fg_color=VintageConfig.COLORS["BG_CARD"],
                                 corner_radius=10, border_width=2, border_color=VintageConfig.COLORS["WARN"])
        info_frame.pack(fill="x", pady=(0, 15))
        
        VintageLabel(info_frame, f"时间: {record['timestamp']}", style="body",
                    text_color=VintageConfig.COLORS["TEXT_MAIN"]).pack(pady=(10, 5))
        VintageLabel(info_frame, f"书籍数量: {len(record['books'])}本", style="body",
                    text_color=VintageConfig.COLORS["TEXT_MAIN"]).pack(pady=5)
        actual_revenue = record.get("actual_revenue", record["total_member_price"])
        VintageLabel(info_frame, f"金额: ${actual_revenue:.2f}", style="body_bold",
                    text_color=VintageConfig.COLORS["ERROR"]).pack(pady=(5, 10))
        
        VintageLabel(content, "删除后无法恢复！", style="body",
                    text_color=VintageConfig.COLORS["WARN"]).pack(pady=(0, 15))
        
        btn_row = ctk.CTkFrame(content, fg_color="transparent")
        btn_row.pack()
        
        def do_delete():
            dialog.destroy()
            record_id = record.get("id")
            if self.data_service.delete_sale(record_id):
                # 同步作废到云端
                self.sync_service.void(record_id, "店员手动删除")
                # 刷新显示
                self.all_records = self.data_service.get_all_sales()
                query = self.search_var.get().lower()
                filtered = self._apply_filters(query)
                self._display_records(filtered)
                self._display_stats(filtered)
                self._show_message("✓ 删除成功（云端已同步作废）")
            else:
                self._show_message("删除失败，请重试")
        
        VintageButton(btn_row, text="取消", width=120,
                     fg_color="transparent",
                     text_color=VintageConfig.COLORS["PRIMARY"],
                     border_width=2,
                     border_color=VintageConfig.COLORS["BORDER"],
                     hover_color=VintageConfig.COLORS["BG_HOVER"],
                     command=dialog.destroy).pack(side="left", padx=5)
        
        VintageButton(btn_row, text="确认删除", width=120,
                     fg_color=VintageConfig.COLORS["ERROR"],
                     hover_color=VintageConfig.COLORS["WARN"],
                     command=do_delete).pack(side="left", padx=5)
    
    def _display_stats(self, records):
        for widget in self.stats_container.winfo_children():
            widget.destroy()
        
        if not records:
            return
        
        stats = self._calculate_stats(records)
        
        # 概览卡片
        overview = ctk.CTkFrame(
            self.stats_container,
            fg_color=VintageConfig.COLORS["BG_CARD"],
            corner_radius=12,
            border_width=2,
            border_color=VintageConfig.COLORS["BORDER"]
        )
        overview.pack(fill="x", pady=(0, 10))
        
        overview_content = ctk.CTkFrame(overview, fg_color="transparent")
        overview_content.pack(fill="both", expand=True, padx=15, pady=12)
        
        self._stat_row(overview_content, "总订单", f"{stats['total_orders']}单")
        self._stat_row(overview_content, "总书籍", f"{stats['total_books']}本")
        self._stat_row(overview_content, "总收入", f"${stats['total_revenue']:.2f}")
        
        # 会员/非会员统计卡片
        if stats['member_orders'] > 0 or stats['standard_orders'] > 0:
            type_card = ctk.CTkFrame(
                self.stats_container,
                fg_color=VintageConfig.COLORS["BG_CARD"],
                corner_radius=12,
                border_width=2,
                border_color=VintageConfig.COLORS["BORDER"]
            )
            type_card.pack(fill="x", pady=(0, 10))
            
            type_content = ctk.CTkFrame(type_card, fg_color="transparent")
            type_content.pack(fill="both", expand=True, padx=15, pady=12)
            
            VintageLabel(type_content, "🎫 购买类型", style="body_bold").pack(pady=(0, 8))
            
            if stats['member_orders'] > 0:
                self._stat_row(type_content, "会员购买", 
                              f"{stats['member_orders']}单 · ${stats['member_revenue']:.0f}")
            if stats['standard_orders'] > 0:
                self._stat_row(type_content, "非会员购买", 
                              f"{stats['standard_orders']}单 · ${stats['standard_revenue']:.0f}")
        
        # 热门分类
        if stats["category_sales"]:
            cat_card = ctk.CTkFrame(
                self.stats_container,
                fg_color=VintageConfig.COLORS["BG_CARD"],
                corner_radius=12,
                border_width=2,
                border_color=VintageConfig.COLORS["BORDER"]
            )
            cat_card.pack(fill="x", pady=(0, 10))
            
            cat_content = ctk.CTkFrame(cat_card, fg_color="transparent")
            cat_content.pack(fill="both", expand=True, padx=15, pady=12)
            
            VintageLabel(cat_content, "📚 热门分类", style="body_bold").pack(pady=(0, 8))
            
            top_cats = sorted(stats["category_sales"].items(), key=lambda x: x[1], reverse=True)[:3]
            for cat, count in top_cats:
                revenue = stats["category_revenue"].get(cat, 0)
                self._stat_row(cat_content, cat, f"{count}本 · ${revenue:.0f}")
        
        # 店长业绩
        if stats["manager_sales"]:
            mgr_card = ctk.CTkFrame(
                self.stats_container,
                fg_color=VintageConfig.COLORS["BG_CARD"],
                corner_radius=12,
                border_width=2,
                border_color=VintageConfig.COLORS["BORDER"]
            )
            mgr_card.pack(fill="x")
            
            mgr_content = ctk.CTkFrame(mgr_card, fg_color="transparent")
            mgr_content.pack(fill="both", expand=True, padx=15, pady=12)
            
            VintageLabel(mgr_content, "👤 店长业绩", style="body_bold").pack(pady=(0, 8))
            
            top_mgrs = sorted(stats["manager_sales"].items(), key=lambda x: x[1], reverse=True)[:3]
            for mgr, count in top_mgrs:
                revenue = stats["manager_revenue"].get(mgr, 0)
                self._stat_row(mgr_content, mgr, f"{count}本 · ${revenue:.0f}")
    
    def _calculate_stats(self, records):
        stats = {
            "total_orders": len(records),
            "total_books": 0,
            "total_revenue": 0.0,
            "member_orders": 0,
            "standard_orders": 0,
            "member_revenue": 0.0,
            "standard_revenue": 0.0,
            "category_sales": defaultdict(int),
            "category_revenue": defaultdict(float),
            "manager_sales": defaultdict(int),
            "manager_revenue": defaultdict(float)
        }
        
        for record in records:
            # 统计总收入（使用实际收入）
            actual_revenue = record.get("actual_revenue", record["total_member_price"])
            stats["total_revenue"] += actual_revenue
            
            # 统计会员/非会员订单
            sale_type = record.get("sale_type", "member")
            if sale_type == "member":
                stats["member_orders"] += 1
                stats["member_revenue"] += actual_revenue
            else:
                stats["standard_orders"] += 1
                stats["standard_revenue"] += actual_revenue
            
            for book in record["books"]:
                stats["total_books"] += 1
                cat = book.get("category", "其他")
                mgr = book.get("manager", "未知")
                price = book["final_price"]
                
                stats["category_sales"][cat] += 1
                stats["category_revenue"][cat] += price
                stats["manager_sales"][mgr] += 1
                stats["manager_revenue"][mgr] += price
        
        return stats
    
    def _stat_row(self, parent, label, value):
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", pady=3)
        
        VintageLabel(row, label, style="small",
                    text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(side="left")
        VintageLabel(row, value, style="body_bold",
                    text_color=VintageConfig.COLORS["TEXT_MAIN"]).pack(side="right")
    
    def _on_search(self, *args):
        query = self.search_var.get().lower()
        filtered = self._apply_filters(query)
        self._display_records(filtered)
        self._display_stats(filtered)
    
    def _on_filter_change(self, *args):
        query = self.search_var.get().lower()
        filtered = self._apply_filters(query)
        self._display_records(filtered)
        self._display_stats(filtered)
    
    def _apply_filters(self, query=""):
        filtered = self.all_records
        
        # 购买类型筛选
        filter_value = self.filter_var.get()
        if filter_value == "会员购买":
            filtered = [r for r in filtered if r.get("sale_type", "member") == "member"]
        elif filter_value == "非会员购买":
            filtered = [r for r in filtered if r.get("sale_type", "member") == "standard"]
        
        # 搜索筛选
        if query:
            filtered = [
                r for r in filtered
                if any(query in book["title"].lower() or query in book.get("manager", "").lower()
                       for book in r["books"])
            ]
        
        return filtered
    
    def _export_excel(self):
        dialog = ExportOptionsDialog(self, len(self.all_records))
        self.wait_window(dialog)
        
        if dialog.result is None:
            return
        
        export_range = dialog.result["range"]
        filename_base = dialog.result["filename"]
        
        if not filename_base:
            filename_base = f"销售报表_{datetime.now().strftime('%Y%m%d')}"
        
        filtered_records = self._filter_records_by_range(export_range)
        
        if not filtered_records:
            self._show_message("所选范围内没有销售记录")
            return
        
        self._do_export(filtered_records, filename_base)
    
    def _filter_records_by_range(self, range_type):
        if range_type == "all":
            return self.all_records
        
        now = datetime.now()
        filtered = []
        
        for record in self.all_records:
            try:
                record_date = datetime.strptime(record["timestamp"].split()[0], "%Y-%m-%d")
                
                if range_type == "7days" and (now - record_date).days <= 7:
                    filtered.append(record)
                elif range_type == "30days" and (now - record_date).days <= 30:
                    filtered.append(record)
                elif range_type == "thismonth" and record_date.year == now.year and record_date.month == now.month:
                    filtered.append(record)
            except:
                continue
        
        return filtered
    
    def _do_export(self, records, filename_base):
        try:
            import pandas as pd
            from tkinter import filedialog
            
            data = []
            for record in records:
                sale_type = record.get("sale_type", "member")
                sale_type_text = "会员" if sale_type == "member" else "非会员"
                
                for book in record["books"]:
                    row = {
                        "日期": record["timestamp"].split()[0],
                        "时间": record["timestamp"].split()[1],
                        "购买类型": sale_type_text,
                        "书名": book["title"],
                        "分类": book.get("category", ""),
                        "店长": book.get("manager", ""),
                        "原价": book["original_price"],
                        "货币": book["currency"],
                        "会员价(AUD)": book.get("member_price", book["final_price"]),
                        "标准价(AUD)": book.get("standard_price", book["final_price"]),
                        "实际售价(AUD)": book["final_price"],
                        "推荐": "是" if book.get("is_recommend") else "否",
                        "二手": "是" if book.get("is_used") else "否",
                        "出租书阁": "是" if book.get("is_rental") else "否"
                    }
                    data.append(row)
            
            if not data:
                self._show_message("暂无数据可导出")
                return
            
            df = pd.DataFrame(data)
            
            filename = filedialog.asksaveasfilename(
                defaultextension=".xlsx",
                filetypes=[("Excel files", "*.xlsx")],
                initialfile=f"{filename_base}.xlsx"
            )
            
            if filename:
                df.to_excel(filename, index=False, sheet_name="销售记录")
                self._show_message(f"✓ 导出成功！\n{len(data)} 条记录已保存")
        
        except ImportError:
            self._show_message("需要安装 pandas 和 openpyxl\n\n请运行：\npip install pandas openpyxl")
        except Exception as e:
            self._show_message(f"导出失败：{str(e)}")
    
    def _clear_all_data(self):
        """清除所有销售记录（需要确认）"""
        if not self.all_records:
            self._show_message("暂无记录需要清除")
            return
        
        # 弹出确认对话框
        result = {"confirmed": False}
        
        dialog = ctk.CTkToplevel(self)
        dialog.title("⚠️ 危险操作")
        dialog.geometry("380x240")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 190
        y = (dialog.winfo_screenheight() // 2) - 120
        dialog.geometry(f"380x240+{x}+{y}")
        
        dialog.transient(self)
        dialog.grab_set()
        
        content = ctk.CTkFrame(dialog, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=20, pady=20)
        
        VintageLabel(content, "⚠️", style="title", text_color=VintageConfig.COLORS["ERROR"]).pack(pady=(0, 10))
        VintageLabel(content, "确认清除所有数据？", style="subtitle").pack(pady=(0, 10))
        
        info_frame = ctk.CTkFrame(content, fg_color=VintageConfig.COLORS["BG_CARD"],
                                 corner_radius=10, border_width=2, border_color=VintageConfig.COLORS["ERROR"])
        info_frame.pack(fill="x", pady=(0, 15))
        
        VintageLabel(info_frame, f"将删除 {len(self.all_records)} 条销售记录",
                    style="body", text_color=VintageConfig.COLORS["ERROR"]).pack(pady=10)
        VintageLabel(info_frame, "此操作无法撤销！",
                    style="body_bold", text_color=VintageConfig.COLORS["WARN"]).pack(pady=(0, 10))
        
        btn_row = ctk.CTkFrame(content, fg_color="transparent")
        btn_row.pack()
        
        def cancel():
            result["confirmed"] = False
            dialog.destroy()
        
        def confirm():
            result["confirmed"] = True
            dialog.destroy()
        
        VintageButton(btn_row, text="取消", width=120,
                     fg_color="transparent",
                     text_color=VintageConfig.COLORS["PRIMARY"],
                     border_width=2,
                     border_color=VintageConfig.COLORS["BORDER"],
                     hover_color=VintageConfig.COLORS["BG_HOVER"],
                     command=cancel).pack(side="left", padx=5)
        
        VintageButton(btn_row, text="确认清除", width=120,
                     fg_color=VintageConfig.COLORS["ERROR"],
                     hover_color=VintageConfig.COLORS["WARN"],
                     command=confirm).pack(side="left", padx=5)
        
        self.wait_window(dialog)
        
        if result["confirmed"]:
            # 执行清除
            if self.data_service.clear_all_sales():
                self.all_records = []
                self._display_records([])
                self._display_stats([])
                self._show_message("✓ 所有记录已清除")
            else:
                self._show_message("清除失败，请重试")
    
    def _show_message(self, msg):
        dialog = ctk.CTkToplevel(self)
        dialog.title("提示")
        dialog.geometry("300x150")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 150
        y = (dialog.winfo_screenheight() // 2) - 75
        dialog.geometry(f"300x150+{x}+{y}")
        
        VintageLabel(dialog, msg, style="body").pack(pady=40)
        VintageButton(dialog, text="好的", width=100, command=dialog.destroy).pack()
        
        if "成功" in msg or "✓" in msg:
            dialog.after(2000, dialog.destroy)

# ---- 主应用 ----

class VintageBookstoreApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # 设置外观
        ctk.set_appearance_mode("light")
        ctk.set_default_color_theme("blue")
        
        self.title(VintageConfig.APP_NAME)
        self.geometry(VintageConfig.GEOMETRY)
        self.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        self.exchange_service = ExchangeRateService()
        self.data_service = DataService()
        self.sync_service = CloudSyncService()
        self.rows = []
        self.current_manager = None
        self._is_first_rate_update = True  # 首次汇率更新标志
        self._ui_initialized = False  # UI 初始化标志
        
        # 闪烁控制
        self._blink_state = False
        self._blink_job = None
        
        # 拦截关闭
        self.protocol("WM_DELETE_WINDOW", self._on_closing)
        
        # 检测系统平台
        self._is_macos = platform.system() == 'Darwin'
        
        # 先登录
        if not self._is_macos:
            # Windows/Linux: 隐藏主窗口
            self.withdraw()
        self.after(100, self._show_login)
    
    def _show_login(self):
        """显示登录对话框"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("店长登录")
        dialog.geometry("400x300")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        # 居中
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 200
        y = (dialog.winfo_screenheight() // 2) - 150
        dialog.geometry(f"400x300+{x}+{y}")
        
        dialog.transient(self)
        if self._is_macos:
            # Mac: 确保窗口显示在最前面
            dialog.lift()
            dialog.focus_force()
        dialog.grab_set()
        
        # 内容
        VintageLabel(dialog, "📚", style="title").pack(pady=(30, 5))
        VintageLabel(dialog, "书店记账本", style="title").pack(pady=(0, 5))
        VintageLabel(dialog, "请选择当值店长", style="label", text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(pady=(0, 30))
        
        managers = self.data_service.get_managers()
        manager_var = ctk.StringVar(value=managers[0] if managers else "")
        
        ctk.CTkComboBox(
            dialog,
            variable=manager_var,
            values=managers,
            width=250,
            height=45,
            font=VintageConfig.FONTS["SUBTITLE"],
            fg_color=VintageConfig.COLORS["BG_CARD"],
            border_color=VintageConfig.COLORS["BORDER"],
            button_color=VintageConfig.COLORS["PRIMARY"],
            text_color=VintageConfig.COLORS["TEXT_MAIN"]
        ).pack(pady=10)
        
        def do_login():
            name = manager_var.get().strip()
            if name:
                if name not in managers:
                    self.data_service.add_manager(name)
                self.current_manager = name
                dialog.destroy()
                if not self._ui_initialized:
                    if not self._is_macos:
                        # Windows/Linux: 显示主窗口
                        self.deiconify()
                    self._setup_ui()
                    self._ui_initialized = True
                    self.after(500, self.refresh_data)
                    # 启动时重试之前失败的云端同步
                    self.after(2000, self.sync_service.retry_pending)
        
        VintageButton(dialog, text="开始值班", width=200, command=do_login).pack(pady=20)
        
        dialog.bind("<Return>", lambda e: do_login())
    
    def _setup_ui(self):
        """构建主界面"""
        # === 顶部栏 ===
        header = ctk.CTkFrame(self, fg_color=VintageConfig.COLORS["BG_CARD"], height=80)
        header.pack(fill="x")
        header.pack_propagate(False)
        
        header_content = ctk.CTkFrame(header, fg_color="transparent")
        header_content.pack(fill="both", expand=True, padx=25, pady=15)
        
        # 左侧
        left = ctk.CTkFrame(header_content, fg_color="transparent")
        left.pack(side="left")
        VintageLabel(left, VintageConfig.APP_NAME, style="title").pack(anchor="w")
        self.manager_label = VintageLabel(left, f"当值店长：{self.current_manager}", style="label", 
                    text_color=VintageConfig.COLORS["TEXT_HINT"])
        self.manager_label.pack(anchor="w")
        
        # 右侧按钮
        btn_container = ctk.CTkFrame(header_content, fg_color="transparent")
        btn_container.pack(side="right")
        
        # 功能按钮
        ctk.CTkButton(
            btn_container,
            text="📊",
            width=40,
            height=40,
            font=("Georgia", 16),
            fg_color=VintageConfig.COLORS["PRIMARY"],
            hover_color=VintageConfig.COLORS["PRIMARY_HOVER"],
            text_color=VintageConfig.COLORS["BG_MAIN"],
            corner_radius=8,
            command=self.show_history
        ).pack(side="right", padx=2)
        
        ctk.CTkButton(
            btn_container,
            text="🔄",
            width=40,
            height=40,
            font=("Georgia", 16),
            fg_color=VintageConfig.COLORS["PRIMARY"],
            hover_color=VintageConfig.COLORS["PRIMARY_HOVER"],
            text_color=VintageConfig.COLORS["BG_MAIN"],
            corner_radius=8,
            command=self.switch_manager
        ).pack(side="right", padx=2)
        
        ctk.CTkButton(
            btn_container,
            text="↻",
            width=40,
            height=40,
            font=("Georgia", 14),
            fg_color="transparent",
            text_color=VintageConfig.COLORS["PRIMARY"],
            border_width=2,
            border_color=VintageConfig.COLORS["BORDER"],
            hover_color=VintageConfig.COLORS["BG_HOVER"],
            command=self.refresh_data
        ).pack(side="right", padx=2)
        
        self.status_label = VintageLabel(btn_container, "就绪", style="label", 
                                        text_color=VintageConfig.COLORS["TEXT_HINT"])
        self.status_label.pack(side="right", padx=10)
        
        # 装饰性分隔线
        Divider(self).pack(fill="x")
        
        # === 书籍列表区 ===
        scroll_container = ctk.CTkFrame(self, fg_color="transparent")
        scroll_container.pack(fill="both", expand=True, padx=20, pady=15)
        
        VintageLabel(scroll_container, "· 书籍清单 ·", style="subtitle", 
                    text_color=VintageConfig.COLORS["PRIMARY"]).pack(pady=(0, 10))
        
        self.scroll = ctk.CTkScrollableFrame(
            scroll_container,
            fg_color="transparent",
            scrollbar_button_color=VintageConfig.COLORS["PRIMARY_LIGHT"],
            scrollbar_button_hover_color=VintageConfig.COLORS["PRIMARY"]
        )
        self.scroll.pack(fill="both", expand=True)
        
        self.empty_label = VintageLabel(
            self.scroll,
            "尚未添加书籍\n请使用下方按钮添加",
            style="label",
            text_color=VintageConfig.COLORS["TEXT_HINT"]
        )
        self.empty_label.pack(pady=50)
        
        # === 底部操作区 ===
        footer = ctk.CTkFrame(self, fg_color=VintageConfig.COLORS["BG_CARD"])
        footer.pack(fill="x", padx=20, pady=20)
        
        footer_content = ctk.CTkFrame(footer, fg_color="transparent")
        footer_content.pack(fill="both", expand=True, padx=20, pady=15)
        
        # 添加按钮行
        btn_row = ctk.CTkFrame(footer_content, fg_color="transparent")
        btn_row.pack(fill="x", pady=(0, 12))
        
        VintageButton(btn_row, text="📕 新书", command=self.add_new).pack(side="left", fill="x", expand=True, padx=(0, 5))
        VintageButton(btn_row, text="♻️ 二手", width=100, command=lambda: self.add_used(5)).pack(side="left", padx=2)
        VintageButton(btn_row, text="🏛️ 书阁", width=100, command=self.add_rental).pack(side="left", padx=(2, 0))
        
        # 价格显示
        self.price_display = PriceDisplay(footer_content)
        self.price_display.pack(fill="x", pady=(0, 12))
        
        # 会员/非会员选择
        sale_type_frame = ctk.CTkFrame(footer_content, fg_color="transparent")
        sale_type_frame.pack(fill="x", pady=(0, 12))
        
        VintageLabel(sale_type_frame, "购买类型：", style="label").pack(side="left", padx=(0, 10))
        
        self.sale_type_var = ctk.StringVar(value="")  # 默认不选择，强制用户选择
        
        VintageLabel(sale_type_frame, "⚠️ 必选", style="small",
                    text_color=VintageConfig.COLORS["WARN"]).pack(side="left", padx=(0, 15))
        
        member_radio = ctk.CTkRadioButton(
            sale_type_frame,
            text="🎫 会员购买",
            variable=self.sale_type_var,
            value="member",
            font=VintageConfig.FONTS["BODY"],
            fg_color=VintageConfig.COLORS["PRIMARY"],
            hover_color=VintageConfig.COLORS["PRIMARY_LIGHT"],
            text_color=VintageConfig.COLORS["TEXT_MAIN"]
        )
        member_radio.pack(side="left", padx=(0, 20))
        
        standard_radio = ctk.CTkRadioButton(
            sale_type_frame,
            text="👥 非会员购买",
            variable=self.sale_type_var,
            value="standard",
            font=VintageConfig.FONTS["BODY"],
            fg_color=VintageConfig.COLORS["PRIMARY"],
            hover_color=VintageConfig.COLORS["PRIMARY_LIGHT"],
            text_color=VintageConfig.COLORS["TEXT_MAIN"]
        )
        standard_radio.pack(side="left")
        
        # 未保存提示
        self.unsaved_warning = VintageLabel(
            footer_content,
            "",
            style="label",
            text_color=VintageConfig.COLORS["WARN"]
        )
        self.unsaved_warning.pack(pady=(0, 8))
        
        # 确认按钮
        self.confirm_btn = VintageButton(
            footer_content,
            text="✓ 确认售出并保存",
            height=50,
            fg_color=VintageConfig.COLORS["ACCENT"],
            hover_color=VintageConfig.COLORS["ACCENT_LIGHT"],
            command=self.confirm_sale
        )
        self.confirm_btn.pack(fill="x")
    
    def add_new(self): self._add_row()
    def add_used(self, p): self._add_row(str(p), used=True)
    def add_rental(self): self._add_row(rental=True)
    
    def _add_row(self, p="", used=False, rental=False):
        if not self.rows: self.empty_label.pack_forget()
        card = BookCard(self.scroll, self.recalc, self._del_row, 
                       self.data_service, self.current_manager, p, used, rental)
        self.rows.append(card)
        self.recalc()
    
    def _del_row(self, card):
        card.destroy()
        if card in self.rows: self.rows.remove(card)
        if not self.rows: self.empty_label.pack(pady=50)
        self.recalc()
    
    def recalc(self):
        # 检查汇率状态
        if not self.exchange_service.has_rates() and len(self.rows) > 0:
            # 有书籍但没有汇率数据
            has_non_aud = any(
                card.get_data()["currency"] != "AUD" and not card.get_data()["is_used"] and not card.get_data()["is_rental"]
                for card in self.rows
            )
            if has_non_aud:
                self.status_label.configure(
                    text="⚠️ 无汇率数据",
                    text_color=VintageConfig.COLORS["ERROR"]
                )
        
        t_mem, t_std = 0.0, 0.0
        rates = self.exchange_service.rates
        for card in self.rows:
            d = card.get_data()
            m, s = PricingEngine.calculate(d["price"], d["currency"], d["is_recommend"], 
                                          d["is_used"], d["is_rental"], rates)
            t_mem += m
            t_std += s
        self.price_display.update(t_mem, t_std)
        self._update_unsaved_warning()
    
    def _update_unsaved_warning(self):
        count = len(self.rows)
        if count > 0:
            self.unsaved_warning.configure(text=f"📌 {count} 本书待保存")
            if self._blink_job is None:
                self._start_blinking()
        else:
            self.unsaved_warning.configure(text="")
            self._stop_blinking()
            self.confirm_btn.configure(fg_color=VintageConfig.COLORS["ACCENT"])
    
    def _start_blinking(self):
        def blink():
            if len(self.rows) == 0:
                self._stop_blinking()
                return
            if self._blink_state:
                self.confirm_btn.configure(fg_color=VintageConfig.COLORS["ACCENT"])
            else:
                self.confirm_btn.configure(fg_color=VintageConfig.COLORS["ACCENT_LIGHT"])
            self._blink_state = not self._blink_state
            self._blink_job = self.after(600, blink)
        blink()
    
    def _stop_blinking(self):
        if self._blink_job:
            self.after_cancel(self._blink_job)
            self._blink_job = None
        self._blink_state = False
    
    def confirm_sale(self):
        if not self.rows:
            return
        
        # 检查是否选择了购买类型
        sale_type = self.sale_type_var.get()
        if not sale_type:
            self._show_message(
                "⚠️ 请选择购买类型\n\n请在下方选择：\n🎫 会员购买 或 👥 非会员购买",
                "提示"
            )
            return
        
        # 检查是否有非AUD的新书但没有汇率
        if not self.exchange_service.has_rates():
            has_non_aud = any(
                card.get_data()["currency"] != "AUD" and not card.get_data()["is_used"] and not card.get_data()["is_rental"]
                for card in self.rows
            )
            if has_non_aud:
                self._show_message(
                    "⚠️ 汇率数据未更新\n\n无法计算非澳元书籍的价格\n\n请点击右上角 ↻ 按钮更新汇率",
                    "网络错误"
                )
                return
        
        for i, card in enumerate(self.rows):
            valid, msg = card.validate()
            if not valid:
                self._show_message(f"第 {i+1} 本书：{msg}", "提示")
                return
        
        # 检测重复书名
        title_counts = {}
        for card in self.rows:
            title = card.get_data()["title"]
            title_counts[title] = title_counts.get(title, 0) + 1
        
        duplicates = [title for title, count in title_counts.items() if count > 1]
        if duplicates:
            # 有重复书名，弹出确认对话框
            if not self._confirm_duplicates(duplicates):
                return
        
        books = []
        t_mem, t_std = 0.0, 0.0
        rates = self.exchange_service.rates
        sale_type = self.sale_type_var.get()  # 获取购买类型
        
        for card in self.rows:
            data = card.get_data()
            m, s = PricingEngine.calculate(data["price"], data["currency"], 
                                          data["is_recommend"], data["is_used"], 
                                          data["is_rental"], rates)
            # 根据购买类型选择价格
            final_price = m if sale_type == "member" else s
            
            books.append({
                "title": data["title"],
                "category": data["category"],
                "manager": data["manager"],
                "original_price": data["price"],
                "currency": data["currency"],
                "is_recommend": data["is_recommend"],
                "is_used": data["is_used"],
                "is_rental": data["is_rental"],
                "member_price": m,
                "standard_price": s,
                "final_price": final_price
            })
            t_mem += m
            t_std += s
        
        # 计算实际收入
        actual_revenue = t_mem if sale_type == "member" else t_std
        
        # 弹出确认对话框，防止误操作
        self._show_sale_confirmation(books, sale_type, t_mem, t_std, actual_revenue)
    
    def _show_sale_confirmation(self, books, sale_type, t_mem, t_std, actual_revenue):
        """售前确认对话框 — 显示所有书目和价格汇总，二次确认后才保存"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("📋 确认售出")
        
        # 根据书的数量动态调整高度
        base_h = 320
        per_book_h = 30
        h = min(base_h + len(books) * per_book_h, 600)
        w = 480
        dialog.geometry(f"{w}x{h}")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - (w // 2)
        y = (dialog.winfo_screenheight() // 2) - (h // 2)
        dialog.geometry(f"{w}x{h}+{x}+{y}")
        
        dialog.transient(self)
        dialog.grab_set()
        
        content = ctk.CTkFrame(dialog, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=20, pady=15)
        
        type_text = "🎫 会员购买" if sale_type == "member" else "👥 非会员购买"
        VintageLabel(content, f"📋 确认售出 · {type_text}", style="subtitle").pack(anchor="w")
        
        Divider(content, height=1).pack(fill="x", pady=(8, 8))
        
        # 书目列表（可滚动）
        list_frame = ctk.CTkScrollableFrame(
            content, fg_color=VintageConfig.COLORS["BG_CARD"],
            corner_radius=8, height=min(len(books) * per_book_h + 10, 250)
        )
        list_frame.pack(fill="x", pady=(0, 10))
        
        for i, b in enumerate(books, 1):
            row = ctk.CTkFrame(list_frame, fg_color="transparent")
            row.pack(fill="x", padx=10, pady=2)
            
            title = b["title"]
            if len(title) > 25:
                title = title[:24] + "…"
            
            VintageLabel(row, f"{i}. {title}", style="body",
                        text_color=VintageConfig.COLORS["TEXT_MAIN"]).pack(side="left")
            VintageLabel(row, f"${b['final_price']:.2f}", style="body_bold",
                        text_color=VintageConfig.COLORS["ACCENT"]).pack(side="right")
        
        Divider(content, height=1).pack(fill="x", pady=(5, 8))
        
        # 价格汇总
        summary = ctk.CTkFrame(content, fg_color="transparent")
        summary.pack(fill="x")
        
        VintageLabel(summary, f"{len(books)} 本书", style="body",
                    text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(side="left")
        VintageLabel(summary, f"合计  ${actual_revenue:.2f}", style="subtitle",
                    text_color=VintageConfig.COLORS["PRIMARY"]).pack(side="right")
        
        # 如果会员价和标准价不同，显示对比
        if sale_type == "member" and abs(t_std - t_mem) > 0.01:
            saved = t_std - t_mem
            VintageLabel(content, f"（标准价 ${t_std:.2f}，会员节省 ${saved:.2f}）",
                        style="small",
                        text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(anchor="e", pady=(2, 0))
        
        # 按钮
        btn_row = ctk.CTkFrame(content, fg_color="transparent")
        btn_row.pack(pady=(15, 0))
        
        VintageButton(btn_row, text="取消", width=120,
                     fg_color="transparent",
                     text_color=VintageConfig.COLORS["PRIMARY"],
                     border_width=2,
                     border_color=VintageConfig.COLORS["BORDER"],
                     hover_color=VintageConfig.COLORS["BG_HOVER"],
                     command=dialog.destroy).pack(side="left", padx=8)
        
        def do_save():
            dialog.destroy()
            record = self.data_service.save_sale(books, t_mem, t_std, sale_type, actual_revenue)
            if record:
                self.sync_service.sync(record)
                self._show_message(f"✓ 已保存\n{type_text}\n{len(books)} 本书 · ${actual_revenue:.2f}", "成功")
                for card in self.rows[:]:
                    self._del_row(card)
        
        VintageButton(btn_row, text="✓ 确认售出", width=160,
                     fg_color=VintageConfig.COLORS["PRIMARY"],
                     command=do_save).pack(side="left", padx=8)
    
    def _on_closing(self):
        if len(self.rows) > 0:
            self._show_confirm_exit()
        else:
            self.destroy()
    
    def _show_confirm_exit(self):
        dialog = ctk.CTkToplevel(self)
        dialog.title("提示")
        dialog.geometry("350x200")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 175
        y = (dialog.winfo_screenheight() // 2) - 100
        dialog.geometry(f"350x200+{x}+{y}")
        
        dialog.transient(self)
        dialog.grab_set()
        
        VintageLabel(dialog, "⚠️", style="title").pack(pady=(20, 10))
        VintageLabel(dialog, f"还有 {len(self.rows)} 本书未保存", style="body").pack(pady=10)
        VintageLabel(dialog, "是否保存后退出？", style="label", 
                    text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(pady=(0, 20))
        
        btn_row = ctk.CTkFrame(dialog, fg_color="transparent")
        btn_row.pack()
        
        def save_exit():
            dialog.destroy()
            self.confirm_sale()
            if len(self.rows) == 0:
                self.destroy()
        
        VintageButton(btn_row, text="保存并退出", width=100, command=save_exit).pack(side="left", padx=5)
        VintageButton(btn_row, text="不保存", width=100, 
                     fg_color=VintageConfig.COLORS["WARN"], 
                     hover_color=VintageConfig.COLORS["ERROR"],
                     command=self.destroy).pack(side="left", padx=5)
        VintageButton(btn_row, text="取消", width=80,
                     fg_color="transparent",
                     text_color=VintageConfig.COLORS["PRIMARY"],
                     border_width=2,
                     border_color=VintageConfig.COLORS["BORDER"],
                     hover_color=VintageConfig.COLORS["BG_HOVER"],
                     command=dialog.destroy).pack(side="left", padx=5)
    
    def _show_message(self, msg, title="提示"):
        dialog = ctk.CTkToplevel(self)
        dialog.title(title)
        dialog.geometry("300x180")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 150
        y = (dialog.winfo_screenheight() // 2) - 90
        dialog.geometry(f"300x180+{x}+{y}")
        
        VintageLabel(dialog, msg, style="body").pack(pady=40)
        VintageButton(dialog, text="好的", width=120, command=dialog.destroy).pack()
        
        if "成功" in title or "✓" in msg:
            dialog.after(2000, dialog.destroy)
    
    def _show_network_warning(self):
        """显示网络错误警告（首次启动时）"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("⚠️ 网络连接失败")
        dialog.geometry("420x280")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 210
        y = (dialog.winfo_screenheight() // 2) - 140
        dialog.geometry(f"420x280+{x}+{y}")
        
        dialog.transient(self)
        dialog.grab_set()
        
        content = ctk.CTkFrame(dialog, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=20, pady=20)
        
        VintageLabel(content, "⚠️", style="title", text_color=VintageConfig.COLORS["WARN"]).pack(pady=(0, 10))
        VintageLabel(content, "无法连接到网络", style="subtitle", text_color=VintageConfig.COLORS["WARN"]).pack(pady=(0, 15))
        
        msg_frame = ctk.CTkFrame(content, fg_color=VintageConfig.COLORS["BG_CARD"], 
                                corner_radius=10, border_width=2, border_color=VintageConfig.COLORS["WARN"])
        msg_frame.pack(fill="x", pady=(0, 15))
        
        VintageLabel(msg_frame, "⚠️ 汇率数据未更新", style="body", 
                    text_color=VintageConfig.COLORS["ERROR"]).pack(pady=(10, 5))
        VintageLabel(msg_frame, "\n无法计算非澳元书籍的价格\n\n请检查网络连接后\n点击右上角 ↻ 按钮更新汇率", 
                    style="body", text_color=VintageConfig.COLORS["TEXT_SUB"]).pack(pady=(0, 10))
        
        VintageButton(content, text="我知道了", width=180, 
                     fg_color=VintageConfig.COLORS["ACCENT"],
                     hover_color=VintageConfig.COLORS["ACCENT_LIGHT"],
                     command=dialog.destroy).pack(pady=(10, 0))
    
    def _confirm_duplicates(self, duplicates: List[str]) -> bool:
        """确认是否保存重复的书名"""
        result = {"confirmed": False}
        
        dialog = ctk.CTkToplevel(self)
        dialog.title("⚠️ 重复书名")
        dialog.geometry("380x260")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 190
        y = (dialog.winfo_screenheight() // 2) - 130
        dialog.geometry(f"380x260+{x}+{y}")
        
        dialog.transient(self)
        dialog.grab_set()
        
        content = ctk.CTkFrame(dialog, fg_color="transparent")
        content.pack(fill="both", expand=True, padx=20, pady=20)
        
        VintageLabel(content, "⚠️", style="title", text_color=VintageConfig.COLORS["WARN"]).pack(pady=(0, 10))
        VintageLabel(content, "检测到重复书名", style="subtitle").pack(pady=(0, 15))
        
        # 显示重复的书名
        dup_frame = ctk.CTkFrame(content, fg_color=VintageConfig.COLORS["BG_CARD"],
                                corner_radius=10, border_width=2, border_color=VintageConfig.COLORS["WARN"])
        dup_frame.pack(fill="x", pady=(0, 15))
        
        for dup in duplicates[:3]:  # 最多显示3个
            display_title = dup if len(dup) <= 25 else dup[:25] + "..."
            VintageLabel(dup_frame, f"《{display_title}》", style="body",
                        text_color=VintageConfig.COLORS["ERROR"]).pack(pady=5)
        
        if len(duplicates) > 3:
            VintageLabel(dup_frame, f"...还有 {len(duplicates) - 3} 本", style="label",
                        text_color=VintageConfig.COLORS["TEXT_HINT"]).pack(pady=5)
        
        VintageLabel(content, "确认继续保存吗？", style="body",
                    text_color=VintageConfig.COLORS["TEXT_SUB"]).pack(pady=(0, 15))
        
        btn_row = ctk.CTkFrame(content, fg_color="transparent")
        btn_row.pack()
        
        def cancel():
            result["confirmed"] = False
            dialog.destroy()
        
        def confirm():
            result["confirmed"] = True
            dialog.destroy()
        
        VintageButton(btn_row, text="取消", width=120,
                     fg_color="transparent",
                     text_color=VintageConfig.COLORS["PRIMARY"],
                     border_width=2,
                     border_color=VintageConfig.COLORS["BORDER"],
                     hover_color=VintageConfig.COLORS["BG_HOVER"],
                     command=cancel).pack(side="left", padx=5)
        
        VintageButton(btn_row, text="确认保存", width=120,
                     fg_color=VintageConfig.COLORS["ACCENT"],
                     hover_color=VintageConfig.COLORS["ACCENT_LIGHT"],
                     command=confirm).pack(side="left", padx=5)
        
        # 等待对话框关闭
        self.wait_window(dialog)
        return result["confirmed"]
    
    def refresh_data(self):
        self.status_label.configure(text="更新中...")
        self.exchange_service.fetch_async(self._on_rate_done, self)
    
    def _on_rate_done(self, ok, msg):
        if ok:
            self.status_label.configure(
                text=f"汇率已更新 {self.exchange_service.last_update}",
                text_color=VintageConfig.COLORS["TEXT_HINT"]
            )
            # 首次更新成功，清除标志
            if self._is_first_rate_update:
                self._is_first_rate_update = False
        else:
            self.status_label.configure(
                text="❌ 网络错误",
                text_color=VintageConfig.COLORS["ERROR"]
            )
            # 如果是首次更新失败，弹出警告
            if self._is_first_rate_update:
                self._show_network_warning()
                self._is_first_rate_update = False
        
        self.recalc()
    
    def show_history(self):
        """显示销售历史"""
        SalesHistoryWindow(self, self.data_service)
    
    def switch_manager(self):
        """切换店长"""
        dialog = ctk.CTkToplevel(self)
        dialog.title("切换店长")
        dialog.geometry("350x200")
        dialog.configure(fg_color=VintageConfig.COLORS["BG_MAIN"])
        
        dialog.update_idletasks()
        x = (dialog.winfo_screenwidth() // 2) - 175
        y = (dialog.winfo_screenheight() // 2) - 100
        dialog.geometry(f"350x200+{x}+{y}")
        
        dialog.transient(self)
        dialog.grab_set()
        
        VintageLabel(dialog, "切换店长", style="heading").pack(pady=(20, 10))
        
        managers = self.data_service.get_managers()
        manager_var = ctk.StringVar(value=self.current_manager)
        
        ctk.CTkComboBox(
            dialog,
            variable=manager_var,
            values=managers,
            width=250,
            height=40,
            font=VintageConfig.FONTS["BODY"],
            fg_color=VintageConfig.COLORS["BG_CARD"],
            border_color=VintageConfig.COLORS["BORDER"],
            button_color=VintageConfig.COLORS["PRIMARY"]
        ).pack(pady=15)
        
        def do_switch():
            name = manager_var.get().strip()
            if name:
                if name not in managers:
                    self.data_service.add_manager(name)
                self.current_manager = name
                # 更新顶部显示的店长名称
                self.manager_label.configure(text=f"当值店长：{name}")
                dialog.destroy()
        
        VintageButton(dialog, text="确认", width=150, command=do_switch).pack()

if __name__ == "__main__":
    # RuntimeFixer.apply_patches()
    
    # Mac 打包后启动提示
    if platform.system() == 'Darwin' and getattr(sys, 'frozen', False):
        # 显示简单的加载窗口
        splash = ctk.CTk()
        splash.title("书店记账本")
        splash.geometry("300x150")
        splash.overrideredirect(True)  # 无边框
        
        # 居中
        splash.update_idletasks()
        x = (splash.winfo_screenwidth() // 2) - 150
        y = (splash.winfo_screenheight() // 2) - 75
        splash.geometry(f"300x150+{x}+{y}")
        
        ctk.CTkLabel(splash, text="📚 书店记账本", font=("Georgia", 18, "bold")).pack(pady=(30, 10))
        ctk.CTkLabel(splash, text="正在启动...", font=("Georgia", 12)).pack(pady=10)
        
        splash.update()
        
        # 延迟启动主应用
        def start_app():
            splash.destroy()
            app = VintageBookstoreApp()
            app.mainloop()
        
        splash.after(100, start_app)
        splash.mainloop()
    else:
        app = VintageBookstoreApp()
        app.mainloop()
