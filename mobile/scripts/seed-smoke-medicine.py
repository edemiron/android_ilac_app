#!/usr/bin/env python3
"""
seed-smoke-medicine.py — Sprint 96.1 AsyncStorage seed helper.

Bu script host tarafında çalışır ve:

1. AVD'den mevcut `medicine-storage` JSON'ı çeker (`sqlite3` + adb run-as)
2. `state.medicines` ve `state.reminderTimes` dizilerine yeni kayıtlar ekler:
   - Medicine:           id=guid, name="SmokeSeed", isActive=true, frequency=1
   - ReminderTime:       medicineId=..., time="08:00", isEnabled=true,
                         smokeTriggerTime=now+TRIGGER_SECONDS (ISO)
3. Güncellenmiş JSON'ı AVD'ye geri yazar (`UPDATE catalystLocalStorage`)
4. App cold-start ile performStartupCleanup → reRegisterAllAlarms →
   scheduleMedicineNotification(... bypassBuffer=false) tetiklenir
5. BootReceiver yolunda smokeTriggerTime onurlandırılır → TRIGGER_SECONDS
   içinde alarm fires olur

Kullanım:
    python3 mobile/scripts/seed-smoke-medicine.py [--seconds=60] [--name="SmokeSeed"]
"""
import argparse
import json
import os
import shlex
import subprocess
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Force UTF-8 stdout/stderr on Windows (cp1254 can't encode checkmarks, etc.)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ADB = "adb"
PKG = "com.ilachatirlatici"
DB_PATH = "/data/data/com.ilachatirlatici/databases/RKStorage"
STORE_KEY = "medicine-storage"


def run(cmd: list[str], **kw) -> str:
    """Execute shell command, return stdout."""
    return subprocess.run(cmd, capture_output=True, text=True, **kw).stdout


def adb(sql: str) -> str:
    """Run sqlite3 query inside app sandbox via adb run-as."""
    # Quote outer; the SQL string may contain single quotes
    cmd = [
        ADB, "shell",
        f'run-as {PKG} sqlite3 {DB_PATH} "{sql.replace(chr(34), chr(92) + chr(34))}"'
    ]
    return run(cmd)


def get_storage() -> dict:
    """Fetch medicine-storage JSON from AVD."""
    raw = adb(f'SELECT value FROM catalystLocalStorage WHERE key="{STORE_KEY}";').strip()
    if not raw:
        sys.exit(f"medicine-storage key not found in {DB_PATH}")
    return json.loads(raw)


def put_storage(payload: dict) -> None:
    """Persist updated JSON back to AsyncStorage.

    AsyncStorage stores plain text via SQLite. Single quotes inside the value
    would normally break out, but JSON uses double quotes. We pass via shell
    heredoc to avoid quoting hell.
    """
    serialized = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    # Use INSERT OR REPLACE
    sql = (
        f"INSERT OR REPLACE INTO catalystLocalStorage(key, value) "
        f"VALUES('{STORE_KEY}', '{serialized}');"
    )
    # Heredoc over adb shell to bypass quoting
    proc = subprocess.run(
        [ADB, "shell", f"run-as {PKG} sqlite3 {DB_PATH}"],
        input=sql + "\n",
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        sys.exit(f"SQLite write failed: {proc.stderr}")
    print(f"  ✓ Updated {STORE_KEY} ({len(serialized)} chars)")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--seconds", type=int, default=60,
                   help="Alarm fire offset from now (default 60)")
    p.add_argument("--name", default="SmokeSeed",
                   help="Smoke medicine name")
    args = p.parse_args()

    print(f"=== seed-smoke-medicine (Sprint 96.1) ===")
    print(f"  trigger offset: now + {args.seconds}s")
    print(f"  medicine name: {args.name}")

    # 1. Fetch existing storage
    print("\n[1/4] Fetch medicine-storage from AVD...")
    storage = get_storage()
    state = storage.setdefault("state", {})
    medicines = state.setdefault("medicines", [])
    reminders = state.setdefault("reminderTimes", [])

    # 2. Construct new medicine + reminder (bypassBuffer=false yolu)
    med_id = str(uuid.uuid4())
    rem_id = f"{med_id}_0"
    now = datetime.now(timezone.utc)
    fire_at = now + timedelta(seconds=args.seconds)

    new_med = {
        "name": args.name,
        "dosage": "100mg",
        "dosageAmount": "1",
        "form": "tablet",
        "frequency": 1,
        "instructions": "any_time",
        "color": "#FF6B6B",
        "stockEnabled": False,
        "requireBarcodeOnTake": False,
        "vibrationPattern": "default",
        "startDate": now.isoformat().replace("+00:00", "Z"),
        "id": med_id,
        "isActive": True,
        "createdAt": now.isoformat().replace("+00:00", "Z"),
        "updatedAt": now.isoformat().replace("+00:00", "Z"),
    }
    new_rem = {
        "id": rem_id,
        "medicineId": med_id,
        "time": "08:00",  # placeholder; smokeTriggerTime override eder
        "isEnabled": True,
        "smokeTriggerTime": fire_at.isoformat().replace("+00:00", "Z"),
    }
    medicines.append(new_med)
    reminders.append(new_rem)

    print(f"  ✓ medicine id: {med_id}")
    print(f"  ✓ reminder id: {rem_id}")
    print(f"  ✓ smokeTriggerTime: {new_rem['smokeTriggerTime']}")

    # 3. Update lastSyncAt
    state["lastSyncAt"] = now.isoformat().replace("+00:00", "Z")

    # 4. Write back
    print("\n[2/4] Persist updated JSON to AVD...")
    put_storage(storage)

    # 5. Force-stop + start
    print("\n[3/4] Force-stop app → cold start performStartupCleanup tetikler...")
    run([ADB, "shell", f"am force-stop {PKG}"])
    import time; time.sleep(2)
    run([ADB, "shell", f"am start -n {PKG}/.MainActivity"])
    print("  ✓ Cold start initiated")

    # 6. Wait
    print(f"\n[4/4] Alarm fires'ı izle ({args.seconds}s bekleme)...")
    print("      (Sprint 95 fix'inin bypassBuffer=false yolu kanıtlanacak)")
    print("      dumpsys alarm ve notification komutları 30 saniyede bir çalıştırılacak")


if __name__ == "__main__":
    main()
