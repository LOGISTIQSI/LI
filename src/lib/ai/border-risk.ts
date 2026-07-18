export interface ExternalRisk {
  riskLevel: "low" | "medium" | "high";
  weatherRisks: string[];
  borderPostStatus: {
    post: string;
    waitTimeHours: number;
    status: "clear" | "congested" | "closed";
  }[];
  politicalInstability: string[];
  routeSafetyAdvisories: string[];
  recommendations: string[];
}

export interface ExternalRiskInput {
  route: string[];
  borderCrossings: string[];
  departureTime: string;
  estimatedTransitDays: number;
}

export async function assessExternalRisks(
  input: ExternalRiskInput
): Promise<ExternalRisk> {
  // Stub: Production integrates weather APIs, border post data feeds,
  // and geopolitical risk databases.
  const hasBorderCrossings = input.borderCrossings.length > 0;

  return {
    riskLevel: hasBorderCrossings ? "medium" : "low",
    weatherRisks: [
      "Thunderstorms forecast along corridor segment A (70% probability, days 1–2)",
      "High winds possible in open plains region (day 3)",
    ],
    borderPostStatus: hasBorderCrossings
      ? [
          {
            post: "Beitbridge",
            waitTimeHours: 4.2,
            status: "congested",
          },
          {
            post: "Kazungula",
            waitTimeHours: 1.8,
            status: "clear",
          },
        ]
      : [],
    politicalInstability: [],
    routeSafetyAdvisories: [
      "Standard precautions: avoid night travel through unlit rural segments",
    ],
    recommendations: hasBorderCrossings
      ? [
          "Pre-clear all border documentation to reduce wait time",
          "Monitor weather radar for corridor A adjustments",
          "Consider Kazungula alternative if Beitbridge congestion exceeds 6 hours",
        ]
      : [
          "Monitor weather conditions along planned route",
          "Standard route safety protocols apply",
        ],
  };
}
