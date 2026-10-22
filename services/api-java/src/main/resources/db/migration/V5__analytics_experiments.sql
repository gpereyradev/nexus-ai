CREATE TABLE analytics_runs (
    id UUID PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source_fingerprint CHAR(64) NOT NULL,
    input_snapshot JSONB NOT NULL CHECK (jsonb_typeof(input_snapshot)='object'),
    result_snapshot JSONB NOT NULL CHECK (jsonb_typeof(result_snapshot)='object')
);
CREATE INDEX ix_analytics_runs_created ON analytics_runs(created_at DESC,id);
CREATE TRIGGER immutable_analytics_runs BEFORE UPDATE OR DELETE ON analytics_runs
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
