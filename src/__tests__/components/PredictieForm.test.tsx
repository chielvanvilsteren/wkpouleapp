import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PredictieForm from "@/components/PredictieForm";
import type { Prediction, Score } from "@/types";

const mockUpsert = jest.fn(() => Promise.resolve({ error: null }));
const mockGetUser = jest.fn(() =>
  Promise.resolve({ data: { user: { id: "user-1" } } }),
);
const mockFrom = jest.fn(() => ({ upsert: mockUpsert }));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: { getUser: mockGetUser },
  })),
}));

const emptyPrediction = null;

const existingPrediction: Prediction = {
  id: "pred-1",
  user_id: "user-1",
  selectie: ["Van Dijk", "De Jong", ...Array(24).fill("")],
  basis_xi: ["Van Dijk", ...Array(10).fill("")],
  is_definitief: false,
  updated_at: "2026-01-01T00:00:00Z",
};

const score: Score = {
  user_id: "user-1",
  selectie_punten: 20,
  basis_xi_punten: 8,
  totaal: 28,
  updated_at: "2026-01-01T00:00:00Z",
};

describe("PredictieForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("renders with null initialPrediction (empty form)", () => {
    render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    const inputs = screen.getAllByPlaceholderText(/^Speler/);
    expect(inputs.length).toBe(37); // 26 + 11
    inputs.forEach((input) => expect(input).toHaveValue(""));
  });

  it("renders with existing prediction values", () => {
    render(
      <PredictieForm
        initialPrediction={existingPrediction}
        isOpen
        score={null}
      />,
    );
    expect(screen.getAllByDisplayValue("Van Dijk").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("De Jong").length).toBeGreaterThan(0);
  });

  it("isOpen=false shows closed banner", () => {
    render(
      <PredictieForm
        initialPrediction={emptyPrediction}
        isOpen={false}
        score={null}
      />,
    );
    expect(screen.getByText(/Inzendingen zijn gesloten/)).toBeInTheDocument();
  });

  it("isOpen=false hides save button", () => {
    render(
      <PredictieForm
        initialPrediction={emptyPrediction}
        isOpen={false}
        score={null}
      />,
    );
    expect(screen.queryByText(/Opslaan/)).not.toBeInTheDocument();
  });

  it("shows score banner when score prop provided", () => {
    render(
      <PredictieForm
        initialPrediction={emptyPrediction}
        isOpen
        score={score}
      />,
    );
    expect(screen.getByText("28")).toBeInTheDocument();
    expect(screen.getByText(/Pre-pool score/)).toBeInTheDocument();
  });

  it("does not show score banner when score is null", () => {
    render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    expect(screen.queryByText(/Pre-pool score/)).not.toBeInTheDocument();
  });

  it("Opslaan calls upsert with is_definitief=true", async () => {
    render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    fireEvent.click(screen.getByText(/Opslaan/));
    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ is_definitief: true }),
        expect.any(Object),
      );
    });
  });

  it('Opslaan shows "Voorspelling opgeslagen" on success', async () => {
    render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    fireEvent.click(screen.getByText(/Opslaan/));
    await waitFor(() => {
      expect(screen.getByText(/Voorspelling opgeslagen/)).toBeInTheDocument();
    });
  });

  it("shows error message when upsert fails", async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: "Connection lost" } });
    render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    fireEvent.click(screen.getByText(/Opslaan/));
    await waitFor(() => {
      expect(screen.getByText(/Connection lost/)).toBeInTheDocument();
    });
  });

  it("stops saving when user not logged in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    fireEvent.click(screen.getByText(/Opslaan/));
    // The save stops — button is no longer in disabled/saving state
    await waitFor(() => {
      // upsert should NOT have been called
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });

  it("progress bars update as inputs filled", () => {
    render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    expect(screen.getByText("0 / 26")).toBeInTheDocument();
    expect(screen.getByText("0 / 11")).toBeInTheDocument();

    const inputs = screen.getAllByPlaceholderText(/^Speler/);
    fireEvent.change(inputs[0], { target: { value: "Van Dijk" } });
    expect(screen.getByText("1 / 26")).toBeInTheDocument();
  });

  it("basis_xi input change triggers updateBasisXi", () => {
    const { container } = render(
      <PredictieForm initialPrediction={emptyPrediction} isOpen score={null} />,
    );
    const allTextInputs = container.querySelectorAll('input[type="text"]');
    // First 26 are selectie, next 11 are basis_xi
    const firstBasisXiInput = allTextInputs[26] as HTMLInputElement;
    fireEvent.change(firstBasisXiInput, { target: { value: "De Vrij" } });
    expect(firstBasisXiInput.value).toBe("De Vrij");
    expect(screen.getByText("1 / 11")).toBeInTheDocument();
  });
});
