import assert from "node:assert/strict";
import test from "node:test";
import {
  assertContentDecayRefreshAssessmentIntegrity,
  buildContentDecayRefreshAssessment,
} from "./content-decay-refresh-detection.js";

const fp=(c:string)=>c.repeat(64);

test("UGP-8.4A emits refresh candidate when search deterioration is corroborated",()=>{
  const result=buildContentDecayRefreshAssessment({
    pageUrl:"https://example.com/guide",
    pageIdentityFingerprint:fp("1"),
    contentOpportunityFingerprint:fp("2"),
    gsc:{
      before:{startDate:"2026-08-01",endDate:"2026-08-31",clicks:100,impressions:1000,ctr:.1,position:5,evidenceFingerprint:fp("3")},
      after:{startDate:"2026-09-01",endDate:"2026-09-30",clicks:60,impressions:700,ctr:.085714,position:9,evidenceFingerprint:fp("4")},
    },
    freshness:{evaluatedDate:"2026-10-01",lastMeaningfulUpdateDate:"2026-03-01",ageDays:214,evidenceFingerprint:fp("5")},
  });
  assert.equal(result.classification,"refresh_candidate");
  assert.equal(result.signals.gscClicksDeclined,true);
  assert.equal(result.signals.gscImpressionsDeclined,true);
  assert.equal(result.signals.gscPositionWorsened,true);
  assert.equal(result.signals.contentStale,true);
  assert.deepEqual(result.evidenceClassesMaterial,["freshness","gsc_performance"]);
  assert.equal(result.expectedMeasurement.causalAttribution,false);
  assertContentDecayRefreshAssessmentIntegrity(result);
});

test("UGP-8.4A watches one uncorroborated deterioration signal",()=>{
  const result=buildContentDecayRefreshAssessment({
    pageUrl:"https://example.com/guide",
    pageIdentityFingerprint:fp("1"),
    contentOpportunityFingerprint:null,
    gsc:{
      before:{startDate:"2026-08-01",endDate:"2026-08-31",clicks:100,impressions:1000,ctr:.1,position:5,evidenceFingerprint:fp("3")},
      after:{startDate:"2026-09-01",endDate:"2026-09-30",clicks:60,impressions:900,ctr:.066667,position:5,evidenceFingerprint:fp("4")},
    },
    freshness:{evaluatedDate:"2026-10-01",lastMeaningfulUpdateDate:"2026-09-20",ageDays:11,evidenceFingerprint:fp("5")},
  });
  assert.equal(result.classification,"watch");
  assert.deepEqual(result.evidenceClassesMaterial,["gsc_performance"]);
});

test("UGP-8.4A can use ranking deterioration plus SERP change as refresh evidence",()=>{
  const result=buildContentDecayRefreshAssessment({
    pageUrl:"https://example.com/guide",
    pageIdentityFingerprint:fp("1"),
    contentOpportunityFingerprint:null,
    ranking:{
      before:{observedDate:"2026-09-01",rank:3,evidenceFingerprint:fp("6")},
      after:{observedDate:"2026-10-01",rank:12,evidenceFingerprint:fp("7")},
    },
    serpChange:{
      beforeEvidenceFingerprint:fp("8"),
      afterEvidenceFingerprint:fp("9"),
      materiallyChanged:true,
      evidenceFingerprint:fp("a"),
    },
  });
  assert.equal(result.classification,"refresh_candidate");
  assert.equal(result.signals.rankingWorsened,true);
  assert.equal(result.signals.serpMateriallyChanged,true);
});

test("UGP-8.4A refuses to infer per-url content change from absent evidence",()=>{
  const result=buildContentDecayRefreshAssessment({
    pageUrl:"https://example.com/guide",
    pageIdentityFingerprint:fp("1"),
    contentOpportunityFingerprint:null,
    freshness:{evaluatedDate:"2026-10-01",lastMeaningfulUpdateDate:"2026-03-01",ageDays:214,evidenceFingerprint:fp("5")},
  });
  assert.equal(result.classification,"defer_insufficient_evidence");
  assert.equal(result.signals.contentMateriallyChanged,false);
  assert.ok(result.limitations.includes("per_url_content_change_evidence_not_supplied"));
});

test("UGP-8.4A rejects inconsistent material-change claims",()=>{
  assert.throws(()=>buildContentDecayRefreshAssessment({
    pageUrl:"https://example.com/guide",
    pageIdentityFingerprint:fp("1"),
    contentOpportunityFingerprint:null,
    serpChange:{
      beforeEvidenceFingerprint:fp("8"),
      afterEvidenceFingerprint:fp("8"),
      materiallyChanged:true,
      evidenceFingerprint:fp("a"),
    },
  }),/serp_change_inconsistent/);
});

test("UGP-8.4A integrity detects tampering",()=>{
  const result=buildContentDecayRefreshAssessment({
    pageUrl:"https://example.com/guide",
    pageIdentityFingerprint:fp("1"),
    contentOpportunityFingerprint:null,
    ranking:{
      before:{observedDate:"2026-09-01",rank:3,evidenceFingerprint:fp("6")},
      after:{observedDate:"2026-10-01",rank:3,evidenceFingerprint:fp("7")},
    },
    freshness:{evaluatedDate:"2026-10-01",lastMeaningfulUpdateDate:"2026-09-20",ageDays:11,evidenceFingerprint:fp("5")},
  });
  assert.equal(result.classification,"stable");
  assert.throws(()=>assertContentDecayRefreshAssessmentIntegrity({...result,assessmentFingerprint:fp("0")}),/assessment_fingerprint_mismatch/);
});
