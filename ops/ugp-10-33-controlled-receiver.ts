type Payload={
  version?:unknown;
  executionFingerprint?:unknown;
  reservationFingerprint?:unknown;
  payloadFingerprint?:unknown;
  subject?:unknown;
  body?:unknown;
};

const HEX64=/^[0-9a-f]{64}$/;
const VERSION="ugp-10-33-controlled-real-web-submission-certification-v1";
const RECEIVER_VERSION="ugp-10-33-controlled-receiver-v1";
const RAILWAY_PROJECT_ID="52265e29-921b-4652-ac0d-9da4e5e69936";
const RAILWAY_ENVIRONMENT_ID="8b8e54ee-810a-4020-b89d-8397d1fa5ef1";
const RAILWAY_ENVIRONMENT_NAME="p12-2-fixture";

if(
  Bun.env.RAILWAY_PROJECT_ID!==RAILWAY_PROJECT_ID
  ||Bun.env.RAILWAY_ENVIRONMENT_ID!==RAILWAY_ENVIRONMENT_ID
  ||Bun.env.RAILWAY_ENVIRONMENT_NAME!==RAILWAY_ENVIRONMENT_NAME
){
  throw new Error("ugp10_33_receiver_exact_nonproduction_environment_required");
}

function hash(value:string):string{
  const h=new Bun.CryptoHasher("sha256");
  h.update(value);
  return h.digest("hex");
}

Bun.serve({
  port:Number(Bun.env.PORT||3000),
  async fetch(request){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/healthz"){
      return new Response("ok",{status:200});
    }
    if(request.method!=="POST"||url.pathname!=="/ugp-10-33/receive"){
      return new Response("not found",{status:404});
    }
    if(request.headers.get("x-ugp-cert-version")!==VERSION){
      return Response.json({error:"version_required"},{status:400});
    }
    let payload:Payload;
    try{
      payload=await request.json() as Payload;
    }catch{
      return Response.json({error:"invalid_json"},{status:400});
    }
    if(
      payload.version!==VERSION
      ||typeof payload.executionFingerprint!=="string"
      ||!HEX64.test(payload.executionFingerprint)
      ||typeof payload.reservationFingerprint!=="string"
      ||!HEX64.test(payload.reservationFingerprint)
      ||typeof payload.payloadFingerprint!=="string"
      ||!HEX64.test(payload.payloadFingerprint)
      ||typeof payload.subject!=="string"
      ||payload.subject.length<1
      ||payload.subject.length>120
      ||typeof payload.body!=="string"
      ||payload.body.length<1
      ||payload.body.length>3000
    ){
      return Response.json({error:"payload_invalid"},{status:400});
    }
    const receiptFingerprint=hash(JSON.stringify({
      purpose:"ugp10_33_controlled_receiver_receipt",
      executionFingerprint:payload.executionFingerprint,
      reservationFingerprint:payload.reservationFingerprint,
      payloadFingerprint:payload.payloadFingerprint,
      subjectHash:hash(payload.subject),
      bodyHash:hash(payload.body),
    }));
    return Response.json({
      version:RECEIVER_VERSION,
      accepted:true,
      executionFingerprint:payload.executionFingerprint,
      payloadFingerprint:payload.payloadFingerprint,
      receiptFingerprint,
    },{
      status:200,
      headers:{
        "cache-control":"no-store",
      },
    });
  },
});
