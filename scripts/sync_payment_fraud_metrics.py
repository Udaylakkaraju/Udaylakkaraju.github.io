from __future__ import annotations

import csv
import io
import json
from datetime import date
from pathlib import Path
from urllib.parse import quote
from urllib.request import urlopen


REPO_OWNER = "Udaylakkaraju"
REPO_NAME = "Payment-Fraud-Detection"
BRANCH = "master"


def raw_url(path: str) -> str:
    encoded = quote(path, safe="/")
    return f"https://raw.githubusercontent.com/{REPO_OWNER}/{REPO_NAME}/{BRANCH}/{encoded}"


def fetch_csv_rows(path: str) -> list[dict[str, str]]:
    with urlopen(raw_url(path)) as resp:
        body = resp.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(body)))


def as_float(value: str) -> float:
    return float(value.strip()) if value is not None and value != "" else 0.0


def format_currency(value: float) -> str:
    return f"${value:,.2f}"


def build_payment_case_study() -> dict:
    payments = fetch_csv_rows("fintech_payments(Main Table).csv")
    retry = fetch_csv_rows("Tables/Smart Retry Analysis (LEAD Window Function).csv")
    holdout = fetch_csv_rows("outputs/train_metrics_report.csv")

    total_txns = len(payments)
    failures = [r for r in payments if r.get("Status") != "00: Success"]
    fail_count = len(failures)
    fail_rate = (fail_count / total_txns * 100) if total_txns else 0.0
    fail_value = sum(as_float(r.get("Amount", "0")) for r in failures)

    total_failures_retry = sum(int(as_float(r.get("Total_Failures", "0"))) for r in retry)
    total_recovered_retry = sum(int(as_float(r.get("Recovered_Txns", "0"))) for r in retry)
    retry_rate = (
        total_recovered_retry / total_failures_retry * 100 if total_failures_retry else 0.0
    )

    holdout_row = holdout[0] if holdout else {}
    recall_pct = as_float(holdout_row.get("recall_pct", "0"))
    precision_pct = as_float(holdout_row.get("precision_pct", "0"))
    false_positives = int(as_float(holdout_row.get("fp", "0")))

    return {
        "problem": "Payment approvals showed concentrated failures by decline reason and hour, while fraud review needed better prioritization.",
        "approach": "Combined SQL diagnostics and Python risk scoring with holdout evaluation, then packaged outputs for reporting and daily batch scoring.",
        "result": (
            f"Analyzed {total_txns:,} payments, quantified a {fail_rate:.2f}% failure rate "
            f"with {format_currency(fail_value)} failed value opportunity, and observed "
            f"{retry_rate:.1f}% post-failure success within 24 hours."
        ),
        "tools": "SQL, Python, Power BI, Risk Scoring",
        "liveUrl": f"https://github.com/{REPO_OWNER}/{REPO_NAME}",
        "codeUrl": f"https://github.com/{REPO_OWNER}/{REPO_NAME}",
        "proofs": [
            f"{total_txns:,} Payments Analyzed",
            f"{retry_rate:.1f}% Retry Opportunity",
            f"{format_currency(fail_value)} Failed Value Pool",
        ],
        "metrics": {
            "transactions_analyzed": total_txns,
            "failed_transactions": fail_count,
            "failed_transaction_rate_pct": round(fail_rate, 2),
            "failed_value_pool_usd": round(fail_value, 2),
            "retry_recovery_rate_pct": round(retry_rate, 1),
            "holdout_recall_pct": round(recall_pct, 1),
            "holdout_precision_pct": round(precision_pct, 1),
            "holdout_false_positives": false_positives,
        },
        "lastUpdated": str(date.today()),
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_path = root / "assets" / "data" / "project-case-studies.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "Payment Fraud Detection": build_payment_case_study(),
    }

    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Updated: {out_path}")


if __name__ == "__main__":
    main()
