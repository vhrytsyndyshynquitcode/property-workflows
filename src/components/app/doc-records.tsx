import { DocParseBlock } from "@/components/app/doc-parse-block";
import { Card, CardContent } from "@/components/ui/card";
import type { DocRecordView } from "@/lib/runs/doc-records";

/** Розділ зрізу 4 на сторінці запуску: блок і записи — лише для менеджера запуску й адміністратора (AC-DOCAI-14, 15). */
export function DocSection({ runId, docs }: { runId: string; docs: { canParse: boolean; records: DocRecordView[] } }) {
  if (!docs.canParse) return null;
  return (
    <>
      <DocParseBlock runId={runId} />
      <DocRecords records={docs.records} />
    </>
  );
}

// Збережені записи документів запуску — тип, значення, хто підтвердив і коли; новіший першим (AC-DOCAI-04).
export function DocRecords({ records }: { records: DocRecordView[] }) {
  if (records.length === 0) return null;
  return (
    <Card data-testid="doc-records">
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Saved values</h2>
        <ul className="flex flex-col divide-y divide-border">
          {records.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 py-3 text-sm" data-testid="doc-record">
              <p className="font-medium">Document type: {r.documentType}</p>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {r.lines.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <dt className="text-muted-foreground">{line.label}</dt>
                    <dd data-testid={`doc-record-${line.label.toLowerCase()}`}>{line.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground" data-testid="doc-record-confirmed">
                Confirmed by {r.confirmedBy}, {r.confirmedAt}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
