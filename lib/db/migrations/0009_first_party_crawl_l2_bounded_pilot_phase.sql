BEGIN;

ALTER TABLE first_party_crawl_l2_invocations
  DROP CONSTRAINT first_party_crawl_l2_invocations_phase_check;

ALTER TABLE first_party_crawl_l2_invocations
  ADD CONSTRAINT first_party_crawl_l2_invocations_phase_check
  CHECK (
    phase IN (
      'bounded_pilot',
      'full_initial',
      'full_interrupt',
      'full_resume',
      'full_reconciliation',
      'incremental'
    )
  );

COMMIT;
