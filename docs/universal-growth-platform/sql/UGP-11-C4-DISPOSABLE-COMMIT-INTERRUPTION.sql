-- UGP-11.C4: disposable-only, deferred COMMIT-phase fault injection.
-- Apply ONLY to loopback /seo_engine_test after the disposable attempt journal.
CREATE FUNCTION ugp11_transport_fixture.pause_commit_marker()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_sleep(12);
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER ugp11_commit_marker_pause
AFTER INSERT ON ugp11_transport_fixture.commit_attempts
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION ugp11_transport_fixture.pause_commit_marker();
