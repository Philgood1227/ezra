import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
    refresh: vi.fn(),
  }),
}));

describe("Auth form validation", () => {
  beforeEach(() => {
    push.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows validation errors on empty login submit", async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByText("Saisissez une adresse email valide.")).toBeInTheDocument();
    expect(
      await screen.findByText("Le mot de passe doit contenir au moins 8 caractères."),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows validation errors on empty register submit", async () => {
    render(<RegisterForm />);

    fireEvent.click(screen.getByRole("button", { name: "Créer le compte" }));

    expect(
      await screen.findByText("Le nom de la famille doit contenir au moins 2 caractères."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Le nom affiché doit contenir au moins 2 caractères."),
    ).toBeInTheDocument();
    expect(await screen.findByText("Saisissez une adresse email valide.")).toBeInTheDocument();
    expect(
      await screen.findByText("Le mot de passe doit contenir au moins 8 caractères."),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
