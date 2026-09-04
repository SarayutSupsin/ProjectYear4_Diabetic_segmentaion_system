"""Add close wound fields to wounds table

Revision ID: a99999999999
Revises: 81e1479850a6
Create Date: 2026-09-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a99999999999'
down_revision: Union[str, None] = '81e1479850a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE wounds ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;")
    op.execute("ALTER TABLE wounds ADD COLUMN IF NOT EXISTS close_reason VARCHAR(255);")
    op.execute("ALTER TABLE wounds ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;")


def downgrade() -> None:
    op.drop_column('wounds', 'closed_at')
    op.drop_column('wounds', 'close_reason')
    op.drop_column('wounds', 'is_active')
