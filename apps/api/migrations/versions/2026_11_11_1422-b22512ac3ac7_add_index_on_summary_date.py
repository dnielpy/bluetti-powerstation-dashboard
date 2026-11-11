from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b22512ac3ac7'
down_revision: Union[str, Sequence[str], None] = '49ea67057bf7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_summary_date'), 'summary', ['date'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_summary_date'), table_name='summary')
