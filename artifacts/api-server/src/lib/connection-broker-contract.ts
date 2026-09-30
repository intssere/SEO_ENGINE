import { createHash } from "node:crypto";
import {
  buildUniversalConnectionIdentity,
  buildUniversalSiteIdentity,
  type UniversalConnectionIdentity,
  type UniversalSiteIdentity,
} from "./universal-site-resource-identity.js";

export const UGP_CONNECTION_BROKER_VERSION =
  "ugp-5-1-connection-broker-contract-v1" as const;

export const CONNECTION_STATES = [
  "pending",
  "connected",
  "degraded",
  "revoked",
] as const;
export type ConnectionState = (typeof CONNECTION_STATES)[number];

export const CONNECTION_HEALTH = [
  "healthy",
  "degraded",
  "unavailable",
  "revoked",
] as const;
export type ConnectionHealthStatus = (typeof CONNECTION_HEALTH)[number];

export type ConnectionBrokerPolicy = Readonly<{
  grantsAuthorization: false;
  grantsProviderWrite: false;
  grantsPublicSiteWrite: false;
  storesCredentialMaterial: false;
  executesProviderRequests: false;
  automaticReconnect: false;
}>;

export type ConnectionStartRequest = Readonly<{
  version: typeof UGP_CONNECTION_BROKER_VERSION;
  site: UniversalSiteIdentity;
  provider: string;
  connectionMode: string;
  requestedAt: string;
  requestFingerprint: string;
}>;

export type ConnectionSession = Readonly<{
  version: typeof UGP_CONNECTION_BROKER_VERSION;
  sessionId: string;
  siteId: string;
  siteIdentityFingerprint: string;
  provider: string;
  connectionMode: string;
  state: "pending";
  requestedAt: string;
  expiresAt: string;
  brokerPolicy: ConnectionBrokerPolicy;
  sessionFingerprint: string;
}>;

export type ConnectionHandle = Readonly<{
  version: typeof UGP_CONNECTION_BROKER_VERSION;
  connection: UniversalConnectionIdentity;
  credentialProfileId: string;
  state: Exclude<ConnectionState, "pending">;
  connectedAt: string;
  lastConfirmedAt: string;
  brokerPolicy: ConnectionBrokerPolicy;
  handleFingerprint: string;
}>;

export type CredentialLease = Readonly<{
  version: typeof UGP_CONNECTION_BROKER_VERSION;
  connectionIdentityFingerprint: string;
  credentialProfileId: string;
  leaseId: string;
  issuedAt: string;
  expiresAt: string;
  renewable: boolean;
  credentialMaterialPresent: false;
  grantsAuthorization: false;
  leaseFingerprint: string;
}>;

export type ConnectionHealth = Readonly<{
  version: typeof UGP_CONNECTION_BROKER_VERSION;
  connectionIdentityFingerprint: string;
  credentialProfileId: string;
  status: ConnectionHealthStatus;
  checkedAt: string;
  reason: string | null;
  grantsAuthorization: false;
  healthFingerprint: string;
}>;

export type ConnectionRevocation = Readonly<{
  version: typeof UGP_CONNECTION_BROKER_VERSION;
  connectionIdentityFingerprint: string;
  credentialProfileId: string;
  revokedAt: string;
  state: "revoked";
  grantsAuthorization: false;
  revocationFingerprint: string;
}>;

export type ReconnectPlan = Readonly<{
  version: typeof UGP_CONNECTION_BROKER_VERSION;
  connectionIdentityFingerprint: string;
  credentialProfileId: string;
  required: boolean;
  reason: string;
  automaticReconnect: false;
  grantsAuthorization: false;
  planFingerprint: string;
}>;

export interface ConnectionBroker {
  beginConnection(input: {
    site: UniversalSiteIdentity;
    provider: string;
    connectionMode: string;
    requestedAt: string;
    sessionId: string;
    expiresAt: string;
  }): ConnectionSession;

  getConnection(input: {
    session: ConnectionSession;
    connectionId: string;
    externalAccountId?: string | null;
    credentialProfileId: string;
    connectedAt: string;
    lastConfirmedAt: string;
  }): ConnectionHandle;

  getCredentialLease(input: {
    handle: ConnectionHandle;
    leaseId: string;
    issuedAt: string;
    expiresAt: string;
    renewable: boolean;
  }): CredentialLease;

  refreshIfRequired(input: {
    lease: CredentialLease;
    now: string;
    refreshBeforeSeconds: number;
  }): Readonly<{ required: boolean; reason: "not_required" | "expiry_window" | "expired" }>;

  revokeConnection(input: {
    handle: ConnectionHandle;
    revokedAt: string;
  }): ConnectionRevocation;

  getHealth(input: {
    handle: ConnectionHandle;
    status: ConnectionHealthStatus;
    checkedAt: string;
    reason?: string | null;
  }): ConnectionHealth;

  planReconnect(input: {
    health: ConnectionHealth;
  }): ReconnectPlan;
}

const KEY=/^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/;
const PROVIDER=/^[a-z0-9][a-z0-9._-]{0,127}$/;
const MAX_PRINTABLE=1024;
const BROKER_POLICY=Object.freeze({
  grantsAuthorization:false as const,
  grantsProviderWrite:false as const,
  grantsPublicSiteWrite:false as const,
  storesCredentialMaterial:false as const,
  executesProviderRequests:false as const,
  automaticReconnect:false as const,
});

function stableJson(value:unknown):string{
  if(value===undefined)return "null";
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return "["+value.map(stableJson).join(",")+"]";
  const o=value as Record<string,unknown>;
  return "{"+Object.keys(o).sort((a,b)=>a.localeCompare(b)).map(k=>JSON.stringify(k)+":"+stableJson(o[k])).join(",")+"}";
}
function stableHash(value:unknown):string{
  return createHash("sha256").update(stableJson(value)).digest("hex");
}
function deepFreeze<T>(value:T):T{
  if(value&&typeof value==="object"&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const nested of Object.values(value as Record<string,unknown>))deepFreeze(nested);
  }
  return value;
}
function exactKey(value:unknown,field:string):string{
  if(typeof value!=="string"||value!==value.trim()||!KEY.test(value))throw new Error("ugp_broker_invalid_"+field);
  return value;
}
function exactProvider(value:unknown):string{
  if(typeof value!=="string"||value!==value.trim()||!PROVIDER.test(value))throw new Error("ugp_broker_invalid_provider");
  return value;
}
function exactPrintable(value:unknown,field:string,allowNull=false):string|null{
  if(value==null&&allowNull)return null;
  if(typeof value!=="string"||value.length<1||value.length>MAX_PRINTABLE||value!==value.trim()||/[\u0000-\u001f\u007f]/.test(value))throw new Error("ugp_broker_invalid_"+field);
  return value;
}
function exactTime(value:unknown,field:string):string{
  if(typeof value!=="string"||value.length<1||value.length>64)throw new Error("ugp_broker_invalid_"+field);
  const ms=Date.parse(value);
  if(!Number.isFinite(ms))throw new Error("ugp_broker_invalid_"+field);
  const canonical=new Date(ms).toISOString();
  if(canonical!==value)throw new Error("ugp_broker_noncanonical_"+field);
  return canonical;
}
function assertSite(site:UniversalSiteIdentity):void{
  const rebuilt=buildUniversalSiteIdentity({siteId:site.siteId,canonicalOrigin:site.canonicalOrigin});
  if(stableJson(rebuilt)!==stableJson(site))throw new Error("ugp_broker_site_integrity_failed");
}
function assertConnection(connection:UniversalConnectionIdentity):void{
  if(!connection||typeof connection!=="object"||Array.isArray(connection))throw new Error("ugp_broker_connection_integrity_failed");
  const base={
    version:connection.version,
    siteId:exactKey(connection.siteId,"connection_site_id"),
    siteIdentityFingerprint:connection.siteIdentityFingerprint,
    connectionId:exactKey(connection.connectionId,"connection_id"),
    provider:exactProvider(connection.provider),
    externalAccountId:exactPrintable(connection.externalAccountId,"external_account_id",true),
    connectionMode:connection.connectionMode==null?null:exactKey(connection.connectionMode,"connection_mode"),
  };
  if(typeof base.siteIdentityFingerprint!=="string"||!/^[0-9a-f]{64}$/.test(base.siteIdentityFingerprint))throw new Error("ugp_broker_connection_integrity_failed");
  const expected=stableHash({purpose:"ugp_connection_identity",...base});
  if(expected!==connection.connectionIdentityFingerprint)throw new Error("ugp_broker_connection_integrity_failed");
}
function assertHandle(handle:ConnectionHandle):void{
  assertConnection(handle.connection);
  if(handle.version!==UGP_CONNECTION_BROKER_VERSION||handle.state!=="connected")throw new Error("ugp_broker_handle_integrity_failed");
  const expected=stableHash({purpose:"ugp_connection_handle",
    version:handle.version,
    connection:handle.connection,
    credentialProfileId:exactPrintable(handle.credentialProfileId,"credential_profile_id",false) as string,
    state:handle.state,
    connectedAt:exactTime(handle.connectedAt,"connected_at"),
    lastConfirmedAt:exactTime(handle.lastConfirmedAt,"last_confirmed_at"),
    brokerPolicy:BROKER_POLICY,
  });
  if(stableJson(handle.brokerPolicy)!==stableJson(BROKER_POLICY)||expected!==handle.handleFingerprint)throw new Error("ugp_broker_handle_integrity_failed");
}
function assertLease(lease:CredentialLease):void{
  if(lease.version!==UGP_CONNECTION_BROKER_VERSION||lease.credentialMaterialPresent!==false||lease.grantsAuthorization!==false)throw new Error("ugp_broker_lease_integrity_failed");
  const base={
    version:lease.version,
    connectionIdentityFingerprint:lease.connectionIdentityFingerprint,
    credentialProfileId:lease.credentialProfileId,
    leaseId:lease.leaseId,
    issuedAt:lease.issuedAt,
    expiresAt:lease.expiresAt,
    renewable:lease.renewable,
    credentialMaterialPresent:false as const,
    grantsAuthorization:false as const,
  };
  if(!/^[0-9a-f]{64}$/.test(base.connectionIdentityFingerprint)||stableHash({purpose:"ugp_credential_lease",...base})!==lease.leaseFingerprint)throw new Error("ugp_broker_lease_integrity_failed");
}
function assertHealth(health:ConnectionHealth):void{
  if(health.version!==UGP_CONNECTION_BROKER_VERSION||health.grantsAuthorization!==false||!(CONNECTION_HEALTH as readonly string[]).includes(health.status))throw new Error("ugp_broker_health_integrity_failed");
  const base={
    version:health.version,
    connectionIdentityFingerprint:health.connectionIdentityFingerprint,
    credentialProfileId:health.credentialProfileId,
    status:health.status,
    checkedAt:health.checkedAt,
    reason:health.reason,
    grantsAuthorization:false as const,
  };
  if(stableHash({purpose:"ugp_connection_health",...base})!==health.healthFingerprint)throw new Error("ugp_broker_health_integrity_failed");
}
function positiveInt(value:unknown,field:string,max:number):number{
  if(typeof value!=="number"||!Number.isSafeInteger(value)||value<0||value>max)throw new Error("ugp_broker_invalid_"+field);
  return value;
}

export function buildConnectionStartRequest(input:{
  site:UniversalSiteIdentity;provider:string;connectionMode:string;requestedAt:string;
}):ConnectionStartRequest{
  assertSite(input.site);
  const base={
    version:UGP_CONNECTION_BROKER_VERSION,
    site:input.site,
    provider:exactProvider(input.provider),
    connectionMode:exactKey(input.connectionMode,"connection_mode"),
    requestedAt:exactTime(input.requestedAt,"requested_at"),
  };
  return deepFreeze({...base,requestFingerprint:stableHash({purpose:"ugp_connection_start_request",siteIdentityFingerprint:base.site.siteIdentityFingerprint,provider:base.provider,connectionMode:base.connectionMode,requestedAt:base.requestedAt})});
}

export function beginConnection(input:{
  request:ConnectionStartRequest;sessionId:string;expiresAt:string;
}):ConnectionSession{
  assertSite(input.request.site);
  const expiresAt=exactTime(input.expiresAt,"session_expires_at");
  if(Date.parse(expiresAt)<=Date.parse(input.request.requestedAt))throw new Error("ugp_broker_session_expiry_invalid");
  const base={
    version:UGP_CONNECTION_BROKER_VERSION,
    sessionId:exactKey(input.sessionId,"session_id"),
    siteId:input.request.site.siteId,
    siteIdentityFingerprint:input.request.site.siteIdentityFingerprint,
    provider:input.request.provider,
    connectionMode:input.request.connectionMode,
    state:"pending" as const,
    requestedAt:input.request.requestedAt,
    expiresAt,
    brokerPolicy:BROKER_POLICY,
  };
  return deepFreeze({...base,sessionFingerprint:stableHash({purpose:"ugp_connection_session",...base})});
}

export function materializeConnectionHandle(input:{
  site:UniversalSiteIdentity;session:ConnectionSession;connectionId:string;externalAccountId?:string|null;credentialProfileId:string;connectedAt:string;lastConfirmedAt:string;
}):ConnectionHandle{
  assertSite(input.site);
  if(input.session.siteIdentityFingerprint!==input.site.siteIdentityFingerprint||input.session.siteId!==input.site.siteId)throw new Error("ugp_broker_session_site_mismatch");
  const connectedAt=exactTime(input.connectedAt,"connected_at");
  const lastConfirmedAt=exactTime(input.lastConfirmedAt,"last_confirmed_at");
  if(Date.parse(connectedAt)<Date.parse(input.session.requestedAt)||Date.parse(connectedAt)>Date.parse(input.session.expiresAt))throw new Error("ugp_broker_connected_at_outside_session");
  if(Date.parse(lastConfirmedAt)<Date.parse(connectedAt))throw new Error("ugp_broker_last_confirmed_before_connected");
  const connection=buildUniversalConnectionIdentity({
    site:input.site,
    connectionId:input.connectionId,
    provider:input.session.provider,
    externalAccountId:input.externalAccountId??null,
    connectionMode:input.session.connectionMode,
  });
  const base={
    version:UGP_CONNECTION_BROKER_VERSION,
    connection,
    credentialProfileId:exactPrintable(input.credentialProfileId,"credential_profile_id",false) as string,
    state:"connected" as const,
    connectedAt,
    lastConfirmedAt,
    brokerPolicy:BROKER_POLICY,
  };
  return deepFreeze({...base,handleFingerprint:stableHash({purpose:"ugp_connection_handle",...base})});
}

export function buildCredentialLease(input:{
  handle:ConnectionHandle;leaseId:string;issuedAt:string;expiresAt:string;renewable:boolean;
}):CredentialLease{
  assertHandle(input.handle);
  const issuedAt=exactTime(input.issuedAt,"lease_issued_at");
  const expiresAt=exactTime(input.expiresAt,"lease_expires_at");
  if(Date.parse(expiresAt)<=Date.parse(issuedAt))throw new Error("ugp_broker_lease_expiry_invalid");
  if(typeof input.renewable!=="boolean")throw new Error("ugp_broker_invalid_renewable");
  const base={
    version:UGP_CONNECTION_BROKER_VERSION,
    connectionIdentityFingerprint:input.handle.connection.connectionIdentityFingerprint,
    credentialProfileId:input.handle.credentialProfileId,
    leaseId:exactKey(input.leaseId,"lease_id"),
    issuedAt,
    expiresAt,
    renewable:input.renewable,
    credentialMaterialPresent:false as const,
    grantsAuthorization:false as const,
  };
  return deepFreeze({...base,leaseFingerprint:stableHash({purpose:"ugp_credential_lease",...base})});
}

export function refreshIfRequired(input:{
  lease:CredentialLease;now:string;refreshBeforeSeconds:number;
}):Readonly<{required:boolean;reason:"not_required"|"expiry_window"|"expired"}>{
  assertLease(input.lease);
  const now=exactTime(input.now,"refresh_now");
  const window=positiveInt(input.refreshBeforeSeconds,"refresh_before_seconds",31_536_000);
  const delta=Date.parse(input.lease.expiresAt)-Date.parse(now);
  if(delta<=0)return Object.freeze({required:true,reason:"expired" as const});
  if(delta<=window*1000)return Object.freeze({required:true,reason:"expiry_window" as const});
  return Object.freeze({required:false,reason:"not_required" as const});
}

export function buildConnectionHealth(input:{
  handle:ConnectionHandle;status:ConnectionHealthStatus;checkedAt:string;reason?:string|null;
}):ConnectionHealth{
  assertHandle(input.handle);
  if(!(CONNECTION_HEALTH as readonly string[]).includes(input.status))throw new Error("ugp_broker_invalid_health_status");
  const reason=exactPrintable(input.reason??null,"health_reason",true);
  if((input.status==="healthy"||input.status==="revoked")&&reason!==null)throw new Error("ugp_broker_health_reason_not_allowed");
  if((input.status==="degraded"||input.status==="unavailable")&&reason===null)throw new Error("ugp_broker_health_reason_required");
  const base={
    version:UGP_CONNECTION_BROKER_VERSION,
    connectionIdentityFingerprint:input.handle.connection.connectionIdentityFingerprint,
    credentialProfileId:input.handle.credentialProfileId,
    status:input.status,
    checkedAt:exactTime(input.checkedAt,"health_checked_at"),
    reason,
    grantsAuthorization:false as const,
  };
  return deepFreeze({...base,healthFingerprint:stableHash({purpose:"ugp_connection_health",...base})});
}

export function revokeConnection(input:{handle:ConnectionHandle;revokedAt:string;}):ConnectionRevocation{
  assertHandle(input.handle);
  const revokedAt=exactTime(input.revokedAt,"revoked_at");
  if(Date.parse(revokedAt)<Date.parse(input.handle.connectedAt))throw new Error("ugp_broker_revocation_before_connection");
  const base={
    version:UGP_CONNECTION_BROKER_VERSION,
    connectionIdentityFingerprint:input.handle.connection.connectionIdentityFingerprint,
    credentialProfileId:input.handle.credentialProfileId,
    revokedAt,
    state:"revoked" as const,
    grantsAuthorization:false as const,
  };
  return deepFreeze({...base,revocationFingerprint:stableHash({purpose:"ugp_connection_revocation",...base})});
}

export function planReconnect(input:{health:ConnectionHealth;}):ReconnectPlan{
  assertHealth(input.health);
  const required=input.health.status==="degraded"||input.health.status==="unavailable"||input.health.status==="revoked";
  const reason=required
    ? input.health.status==="revoked"?"connection_revoked":"connection_"+input.health.status
    : "healthy";
  const base={
    version:UGP_CONNECTION_BROKER_VERSION,
    connectionIdentityFingerprint:input.health.connectionIdentityFingerprint,
    credentialProfileId:input.health.credentialProfileId,
    required,
    reason,
    automaticReconnect:false as const,
    grantsAuthorization:false as const,
  };
  return deepFreeze({...base,planFingerprint:stableHash({purpose:"ugp_reconnect_plan",...base})});
}
