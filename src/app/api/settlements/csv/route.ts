import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/settlements/csv — export CSV for bulk payment upload (SA business banking format)
export async function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "approved";

  const settlements = await db.prepare(`
    SELECT
      s.driver_payable,
      s.payment_status,
      sh.shipment_id AS shipment_ref,
      d.bank_account_holder,
      d.bank_name,
      d.bank_account_number,
      d.bank_account_type,
      d.bank_branch_code
    FROM settlements s
    JOIN shipments sh ON s.shipment_id = sh.id
    JOIN drivers d ON s.driver_id = d.id
    WHERE s.payment_status = ?
    ORDER BY s.id ASC
  `).all(status);

  // Build CSV
  const header = "Beneficiary Name,Bank Name,Account Number,Account Type,Branch Code,Amount,Payment Reference";
  const rows = (settlements as Record<string, unknown>[]).map((s) => {
    const beneficiary = escapeCsv(String(s.bank_account_holder || ""));
    const bankName = escapeCsv(String(s.bank_name || ""));
    const accountNumber = escapeCsv(String(s.bank_account_number || ""));
    const accountType = escapeCsv(String(s.bank_account_type || "cheque"));
    const branchCode = escapeCsv(String(s.bank_branch_code || ""));
    const amount = Number(s.driver_payable || 0).toFixed(2);
    const reference = `LOGISTIQS-${s.shipment_ref}`;

    return `${beneficiary},${bankName},${accountNumber},${accountType},${branchCode},${amount},${reference}`;
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="settlements-bulk-payment-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
