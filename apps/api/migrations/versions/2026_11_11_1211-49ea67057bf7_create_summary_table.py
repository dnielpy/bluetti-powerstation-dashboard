from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '49ea67057bf7'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('summary',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('battery_percent', sa.Integer(), nullable=False),
    sa.Column('ac_output', sa.Integer(), nullable=False),
    sa.Column('ac_input', sa.Integer(), nullable=False),
    sa.Column('dc_output', sa.Integer(), nullable=False),
    sa.Column('dc_input', sa.Integer(), nullable=False),
    sa.Column('ac', sa.Boolean(), nullable=False),
    sa.Column('dc', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('summary')
