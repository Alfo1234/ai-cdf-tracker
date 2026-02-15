# data_pipeline/import_projects.py
import argparse
import csv
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlmodel import Session, select

# IMPORTANT: run from project root
from backend.database.db import engine
from backend.models.project import Project, ProjectCategory, ProjectStatus


from backend.models.constituency import Constituency  # noqa
from backend.models.procurement_award import ProcurementAward  # noqa
from backend.models.contractor import Contractor  # noqa


def parse_date(value: str) -> Optional[datetime]:
    value = (value or "").strip()
    if not value:
        return None
    return datetime.strptime(value, "%Y-%m-%d")


def normalize_category(value: str) -> ProjectCategory:
    value = (value or "").strip()
    return ProjectCategory(value)  # will raise if invalid


def normalize_status(value: str) -> ProjectStatus:
    value = (value or "").strip()
    return ProjectStatus(value)  # will raise if invalid


def as_float(value: str) -> Optional[float]:
    value = (value or "").strip()
    if value == "":
        return None
    return float(value)


def as_bool(value: str) -> bool:
    value = (value or "").strip().lower()
    return value in ("1", "true", "yes", "y")


def find_existing(
    session: Session,
    title: str,
    constituency_code: str,
    source_doc_ref: Optional[str],
) -> Optional[Project]:
    # idempotency key: title + constituency_code + source_doc_ref
    stmt = select(Project).where(Project.title == title).where(Project.constituency_code == constituency_code)
    if source_doc_ref:
        stmt = stmt.where(Project.source_doc_ref == source_doc_ref)
    else:
        stmt = stmt.where(Project.source_doc_ref.is_(None))

    return session.exec(stmt).first()


def import_csv(file_path: Path) -> tuple[int, int]:
    created = 0
    updated = 0

    with Session(engine) as session:
        with file_path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)

            for row in reader:
                title = (row.get("title") or "").strip()
                constituency_code = (row.get("constituency_code") or "").strip()
                if not title or not constituency_code:
                    print("Skipping row (missing title/constituency_code):", row)
                    continue

                source_doc_ref = (row.get("source_doc_ref") or "").strip() or None

                existing = find_existing(session, title, constituency_code, source_doc_ref)

                payload = dict(
                    title=title,
                    description=(row.get("description") or "").strip() or None,
                    category=normalize_category(row.get("category") or "Other"),
                    status=normalize_status(row.get("status") or "Planned"),
                    budget=float(row.get("budget") or 0),
                    spent=as_float(row.get("spent") or ""),
                    progress=as_float(row.get("progress") or ""),
                    constituency_code=constituency_code,
                    start_date=parse_date(row.get("start_date") or ""),
                    completion_date=parse_date(row.get("completion_date") or ""),
                    # provenance
                    is_mock=as_bool(row.get("is_mock") or "false"),
                    source_name=(row.get("source_name") or "").strip() or None,
                    source_url=(row.get("source_url") or "").strip() or None,
                    source_doc_ref=source_doc_ref,
                )

                if existing:
                    # update selected fields
                    for k, v in payload.items():
                        setattr(existing, k, v)
                    session.add(existing)
                    updated += 1
                else:
                    project = Project(**payload)
                    session.add(project)
                    created += 1

            session.commit()

    return created, updated


def main():
    parser = argparse.ArgumentParser(description="Import projects into DB (idempotent).")
    parser.add_argument("--file", required=True, help="CSV file path, e.g. data/real_sample.csv")
    args = parser.parse_args()

    file_path = Path(args.file)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    created, updated = import_csv(file_path)
    print(f"✅ Import complete. Created: {created}, Updated: {updated}")


if __name__ == "__main__":
    main()
