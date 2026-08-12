import supertest from "supertest";

import { createApp } from "../../src/app.js";

export type Agent = ReturnType<typeof supertest.agent>;

export function makeApp() {
  return createApp();
}

/** A fresh supertest agent bound to its own app instance (isolates the in-memory rate limiter per test). */
export function makeAgent(): Agent {
  return supertest.agent(createApp());
}

let seq = 0;
export function validRegisterPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  seq += 1;
  const tag = `${Date.now().toString(36)}${seq}`;
  return {
    tenantName: `Test Chits ${tag}`,
    registrationNumber: `KL/CHIT/${tag}`,
    contactEmail: `org-${tag}@example.com`,
    contactPhone: "9876543210",
    address: { line1: "1 MG Road", city: "Kochi", state: "Kerala", pincode: "682001", country: "India" },
    organizerName: "Test Organizer",
    organizerEmail: `owner-${tag}@example.com`,
    organizerPhone: "9812345678",
    organizerPassword: "TestPass123",
    ...overrides,
  };
}

export interface AuthUser {
  id: string;
  tenantId: string | null;
  email: string;
  permissions: string[];
  role: { id: string; name: string; slug?: string };
}

export interface RegisteredOrg {
  agent: Agent;
  accessToken: string;
  user: AuthUser;
  email: string;
  password: string;
}

/** Registers a brand-new organization over the real API and returns an authenticated agent. */
export async function registerOrg(overrides: Record<string, unknown> = {}): Promise<RegisteredOrg> {
  const agent = makeAgent();
  const payload = validRegisterPayload(overrides);
  const res = await agent.post("/api/auth/register-organizer").send(payload);
  if (res.status !== 201) {
    throw new Error(`register-organizer failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return {
    agent,
    accessToken: res.body.accessToken as string,
    user: res.body.user as AuthUser,
    email: payload["organizerEmail"] as string,
    password: payload["organizerPassword"] as string,
  };
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
