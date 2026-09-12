import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
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

type AuthorizationError = { error?: string };
type AuthorizationVariables = {
  id: string;
  data: InternalActionAuthorizationRequest;
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
