"""Add public_id to patients

Revision ID: b00000000001
Revises: a99999999999
Create Date: 2026-10-01 00:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b00000000001'
down_revision: Union[str, None] = 'a99999999999'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) เพิ่มคอลัมน์แบบ nullable ก่อน (ผู้ป่วยเดิมยังไม่มีค่า)
    op.add_column('patients', sa.Column('public_id', sa.String(length=36), nullable=True))

    # 2) ใส่รหัสสุ่มให้ผู้ป่วยทุกคนที่มีอยู่แล้ว
    conn = op.get_bind()
    patients = sa.table('patients', sa.column('HN', sa.String), sa.column('public_id', sa.String))
    hns = [row[0] for row in conn.execute(sa.select(patients.c.HN)).fetchall()]
    for hn in hns:
        conn.execute(
            patients.update().where(patients.c.HN == hn).values(public_id=str(uuid.uuid4()))
        )

    # 3) บังคับให้ต้องมีค่า และห้ามซ้ำ
    op.alter_column('patients', 'public_id', existing_type=sa.String(length=36), nullable=False)
    op.create_index(op.f('ix_patients_public_id'), 'patients', ['public_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_patients_public_id'), table_name='patients')
    op.drop_column('patients', 'public_id')