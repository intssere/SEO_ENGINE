import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  customFetch,
  type CustomFetchOptions,
  type ErrorType,
} from "./custom-fetch";

export interface InternalActionAuthorizationRequest {
  proposalFingerprint: string;
  confirmation: string;
}

export interface InternalActionAuthorizationResponse {
  action_id: string;
  action_plan_id: string;
  lifecycle: "executable_action";
  action_status: "pending";
  authorization_fingerprint: string;
  authorization_expires_at: string;
  verification_status: "pending";
  rollback_eligible: false;
  execution_authorized: true;
  provider_write_allowed: false;
  public_site_writes: false;
  public_write_occurred: false;
  created_at: string;
}

export interface AuthorizationWindowRenewalResponse {
  renewal_approval_id: string;
  action_plan_id: string;
  decision: "approved";
  lifecycle: "approved_proposal";
  proposal_fingerprint: string;
  previous_authorization_expires_at: string;
  renewed_at: string;
  authorization_expires_at: string;
  execution_authorized: false;
  provider_write_allowed: false;
  public_site_writes: false;
  automatic_transition: false;
}

export interface ExecutableActionAuthorizationRenewalRequest {
  currentAuthorizationFingerprint: string;
  confirmation: string;
}

export interface ExecutableActionAuthorizationRenewalResponse {
  renewal_approval_id: string;
  action_id: string;
  action_plan_id: string;
  lifecycle: "executable_action";
  action_status: "pending";
  previous_authorization_fingerprint: string;
  authorization_fingerprint: string;
  previous_authorization_expires_at: string;
  renewed_at: string;
  authorization_expires_at: string;
  provider_state_fingerprint: string;
  provider_request_id: string | null;
  provider_resource: { kind: "product" | "collection"; handle: string; gid: string };
  execution_authorized: true;
  provider_write_allowed: false;
  public_site_writes: false;
  automatic_transition: false;
  public_write_occurred: false;
  mutation_performed: false;
}

export interface ExecutionFoundationRow {
  action_id: string;
  action_plan_id: string;
  action_type: string;
  action_status: string;
  target: Record<string, unknown>;
  proposed_change: {
    value?: string | null;
    fingerprint?: string;
    authorizationEnvelope?: {
      envelopeFingerprint?: string;
      authorization?: {
        issuedAt?: string;
        expiresAt?: string;
        executionAuthorized?: boolean;
        providerWriteAllowed?: boolean;
        publicSiteWrites?: boolean;
        automaticTransition?: boolean;
      };
    };
  };
  expected_state: Record<string, unknown>;
  lifecycle: string;
  execution_authorized: boolean;
  public_site_writes: boolean;
  verification_status: string;
  rollback_eligible: boolean;
  public_write_occurred: boolean;
}

export interface ExecutionFoundationResponse {
  readiness: { state?: string; message?: string };
  rows: ExecutionFoundationRow[];
  task53?: {
    provider_write_dispatch_enabled?: boolean;
    capability?: {
      connected?: boolean;
      writeProductsScopePresent?: boolean;
      credentialAvailable?: boolean;
    };
  };
}

type AuthorizationError = { error?: string };
type AuthorizationVariables = {
  id: string;
  data: InternalActionAuthorizationRequest;
};
type ExecutableActionRenewalVariables = {
  actionId: string;
  data: ExecutableActionAuthorizationRenewalRequest;
};

export function buildInternalActionConfirmation(
  planId: string,
  proposalFingerprint: string,
) {
  return `AUTHORIZE:${planId}:${proposalFingerprint}`;
}

export function buildAuthorizationWindowRenewalConfirmation(
  planId: string,
  proposalFingerprint: string,
) {
  return `RENEW_AUTHORIZATION_WINDOW:${planId}:${proposalFingerprint}`;
}

export function buildExecutableActionRenewalConfirmation(
  actionId: string,
  currentAuthorizationFingerprint: string,
) {
  return `RENEW_EXECUTABLE_ACTION_AUTHORIZATION:${actionId}:${currentAuthorizationFingerprint}`;
}

export async function authorizeInternalAction(
  id: string,
  data: InternalActionAuthorizationRequest,
  options?: CustomFetchOptions,
): Promise<InternalActionAuthorizationResponse> {
  return customFetch<InternalActionAuthorizationResponse>(
    `/api/execution/${id}/authorize`,
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(data),
    },
  );
}

export async function renewAuthorizationWindow(
  id: string,
  data: InternalActionAuthorizationRequest,
  options?: CustomFetchOptions,
): Promise<AuthorizationWindowRenewalResponse> {
  return customFetch<AuthorizationWindowRenewalResponse>(
    `/api/execution/${id}/renew-authorization-window`,
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(data),
    },
  );
}

export async function renewExecutableActionAuthorization(
  actionId: string,
  data: ExecutableActionAuthorizationRenewalRequest,
  options?: CustomFetchOptions,
): Promise<ExecutableActionAuthorizationRenewalResponse> {
  return customFetch<ExecutableActionAuthorizationRenewalResponse>(
    `/api/execution/actions/${actionId}/renew-authorization`,
    {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
      body: JSON.stringify(data),
    },
  );
}

export function getExecutionFoundationQueryKey() {
  return ["executionFoundation"] as const;
}

export async function getExecutionFoundation(
  options?: CustomFetchOptions,
): Promise<ExecutionFoundationResponse> {
  return customFetch<ExecutionFoundationResponse>("/api/execution", options);
}

export function useExecutionFoundation<TData = ExecutionFoundationResponse>(options?: {
  query?: Omit<UseQueryOptions<ExecutionFoundationResponse, ErrorType<AuthorizationError>, TData>, "queryKey" | "queryFn">;
  request?: CustomFetchOptions;
}): UseQueryResult<TData, ErrorType<AuthorizationError>> {
  const requestOptions = options?.request;
  return useQuery({
    queryKey: getExecutionFoundationQueryKey(),
    queryFn: () => getExecutionFoundation(requestOptions),
    ...options?.query,
  });
}

export function useAuthorizeInternalAction<TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    InternalActionAuthorizationResponse,
    ErrorType<AuthorizationError>,
    AuthorizationVariables,
    TContext
  >;
  request?: CustomFetchOptions;
}): UseMutationResult<
  InternalActionAuthorizationResponse,
  ErrorType<AuthorizationError>,
  AuthorizationVariables,
  TContext
> {
  const requestOptions = options?.request;
  return useMutation({
    mutationKey: ["authorizeInternalAction"],
    mutationFn: ({ id, data }) =>
      authorizeInternalAction(id, data, requestOptions),
    ...options?.mutation,
  });
}

export function useRenewAuthorizationWindow<TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    AuthorizationWindowRenewalResponse,
    ErrorType<AuthorizationError>,
    AuthorizationVariables,
    TContext
  >;
  request?: CustomFetchOptions;
}): UseMutationResult<
  AuthorizationWindowRenewalResponse,
  ErrorType<AuthorizationError>,
  AuthorizationVariables,
  TContext
> {
  const requestOptions = options?.request;
  return useMutation({
    mutationKey: ["renewAuthorizationWindow"],
    mutationFn: ({ id, data }) =>
      renewAuthorizationWindow(id, data, requestOptions),
    ...options?.mutation,
  });
}

export function useRenewExecutableActionAuthorization<TContext = unknown>(options?: {
  mutation?: UseMutationOptions<
    ExecutableActionAuthorizationRenewalResponse,
    ErrorType<AuthorizationError>,
    ExecutableActionRenewalVariables,
    TContext
  >;
  request?: CustomFetchOptions;
}): UseMutationResult<
  ExecutableActionAuthorizationRenewalResponse,
  ErrorType<AuthorizationError>,
  ExecutableActionRenewalVariables,
  TContext
> {
  const requestOptions = options?.request;
  return useMutation({
    mutationKey: ["renewExecutableActionAuthorization"],
    mutationFn: ({ actionId, data }) =>
      renewExecutableActionAuthorization(actionId, data, requestOptions),
    ...options?.mutation,
  });
}
