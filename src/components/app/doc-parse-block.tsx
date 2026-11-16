"use client";

import { useActionState, useEffect, useState } from "react";
import { requestDocValues, saveDocValues, type RequestState } from "@/app/runs/[id]/doc-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { DOCUMENT_TYPE_LABEL, MESSAGES, docBlockView, isPlainTextFile, type Proposal } from "@/lib/ai/doc-values";
import { CATEGORIES, DOCUMENT_TYPES, URGENCIES, type DocumentType, type LineItem } from "@/lib/ai/schema";

// Блок «Parse a document» на сторінці запуску (openspec/specs/doc-parsing). Рендерить його сторінка лише для менеджера
// запуску й адміністратора (AC-DOCAI-14, AC-DOCAI-15); дії перевіряють права ще раз (AC-DOCAI-16).
// «Discard» і успішне «Save values» починають блок заново (новий key) — без запиту до сервера (AC-DOCAI-05).
export function DocParseBlock({ runId }: { runId: string }) {
  const [round, setRound] = useState(0);
  return <DocParseRound key={round} runId={runId} onDone={() => setRound((r) => r + 1)} />;
}

type Values = Extract<Proposal, { kind: "values" }>;
const EMPTY_ITEM: LineItem = { name: "", quantity: 1, unitPrice: 0 };

function DocParseRound({ runId, onDone }: { runId: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [state, propose, pending] = useActionState<RequestState, FormData>(requestDocValues, null);

  // AC-DOCAI-12: лише простий текст; файл читається в поле тексту (сам файл на сервер не йде).
  function onFile(file: File | undefined) {
    if (!file) return;
    if (!isPlainTextFile(file.name, file.type)) {
      setFileError(MESSAGES.notPlainText);
      return;
    }
    setFileError(null);
    void file.text().then(setText);
  }

  const view = docBlockView(state, pending);
  return (
    <Card data-testid="doc-parse-block">
      <CardContent className="flex flex-col gap-5">
        <h2 className="text-base font-semibold">Parse a document</h2>
        <form action={propose} className="flex flex-col gap-3">
          <input type="hidden" name="runId" value={runId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc-text">Text of a request or an estimate</Label>
            <Textarea id="doc-text" name="text" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="doc-file">Upload a text file</Label>
            <Input id="doc-file" type="file" accept=".txt,text/plain" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {fileError ? (
            <Alert variant="destructive" data-testid="doc-message">
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          ) : null}
          <div>
            <Button type="submit" disabled={view.proposeDisabled}>
              Propose values
            </Button>
          </div>
        </form>
        {view.reading ? (
          <p className="text-sm text-muted-foreground" role="status" data-testid="doc-reading">
            {view.reading}
          </p>
        ) : null}
        {view.message ? (
          <Alert data-testid="doc-message">
            <AlertDescription>{view.message}</AlertDescription>
          </Alert>
        ) : null}
        {view.form === "manual" ? <ValuesForm runId={runId} initial={null} onDone={onDone} /> : null}
        {view.form === "proposal" && state?.kind === "values" ? <ValuesForm runId={runId} initial={state} onDone={onDone} /> : null}
      </CardContent>
    </Card>
  );
}

/** Значення, які людина бачить і може виправити; «Save values» — запис, «Discard» — нічого (AC-DOCAI-04, 05, 13). */
function ValuesForm({ runId, initial, onDone }: { runId: string; initial: Values | null; onDone: () => void }) {
  const [type, setType] = useState<DocumentType | "">(initial?.documentType ?? "");
  const [items, setItems] = useState<LineItem[]>(initial?.items.length ? initial.items : [EMPTY_ITEM]);
  const [saveState, save, saving] = useActionState(saveDocValues, null);
  useEffect(() => {
    if (saveState?.kind === "saved") onDone();
  }, [saveState, onDone]);

  return (
    <form action={save} className="flex flex-col gap-5" data-testid="doc-values">
      <input type="hidden" name="runId" value={runId} />
      {initial?.notes.map((note) => (
        <Alert key={note} data-testid="doc-note">
          <AlertDescription>{note}</AlertDescription>
        </Alert>
      ))}
      {initial?.warning ? (
        <Alert variant="destructive" data-testid="doc-warning">
          <AlertDescription>{initial.warning}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-type">Document type</Label>
        <NativeSelect id="doc-type" name="documentType" value={type} onChange={(e) => setType(e.target.value as DocumentType | "")}>
          <option value="">—</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {DOCUMENT_TYPE_LABEL[t]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {type === "maintenance_request" ? <RequestFields initial={initial} /> : null}
      {type === "estimate" ? <EstimateFields items={items} setItems={setItems} total={initial?.total ?? null} /> : null}
      {saveState?.kind === "error" ? (
        <Alert variant="destructive" data-testid="doc-save-error">
          <AlertDescription>{saveState.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving || type === ""}>
          Save values
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Discard
        </Button>
      </div>
    </form>
  );
}

/** Порожнє запропоноване значення — «not found» поруч із полем (AC-DOCAI-06). */
function NotFound({ show, id }: { show: boolean; id: string }) {
  return show ? (
    <span id={id} className="text-sm text-muted-foreground" data-testid="not-found">
      {MESSAGES.notFound}
    </span>
  ) : null;
}

function RequestFields({ initial }: { initial: Values | null }) {
  const proposed = initial !== null;
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-phone">Phone</Label>
        <Input id="doc-phone" name="phone" defaultValue={initial?.phone ?? ""} aria-describedby="doc-phone-nf" />
        <NotFound show={proposed && !initial?.phone} id="doc-phone-nf" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-description">Description</Label>
        <Textarea id="doc-description" name="description" defaultValue={initial?.description ?? ""} className="min-h-20" aria-describedby="doc-description-nf" />
        <NotFound show={proposed && !initial?.description} id="doc-description-nf" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-category">Category</Label>
        <NativeSelect id="doc-category" name="category" defaultValue={initial?.category ?? ""} aria-describedby="doc-category-nf">
          <option value="">—</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <NotFound show={proposed && !initial?.category} id="doc-category-nf" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-urgency">Urgency</Label>
        <NativeSelect id="doc-urgency" name="urgency" defaultValue={initial?.urgency ?? ""} aria-describedby="doc-urgency-nf">
          <option value="">—</option>
          {URGENCIES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </NativeSelect>
        <NotFound show={proposed && !initial?.urgency} id="doc-urgency-nf" />
      </div>
    </>
  );
}

function EstimateFields({ items, setItems, total }: { items: LineItem[]; setItems: (i: LineItem[]) => void; total: number | null }) {
  return (
    <>
      <div className="flex flex-col gap-3" data-testid="doc-items">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="doc-item">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`item-name-${i}`}>Item</Label>
              <Input id={`item-name-${i}`} name="itemName" defaultValue={item.name} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`item-quantity-${i}`}>Quantity</Label>
              <Input id={`item-quantity-${i}`} name="itemQuantity" type="number" step="any" min="0" defaultValue={item.quantity} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`item-price-${i}`}>Unit price</Label>
              <Input id={`item-price-${i}`} name="itemUnitPrice" type="number" step="0.01" min="0" defaultValue={item.unitPrice.toFixed(2)} />
            </div>
          </div>
        ))}
        <div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setItems([...items, EMPTY_ITEM])}>
            Add an item
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="doc-total">Total</Label>
        <Input id="doc-total" name="total" type="number" step="0.01" min="0" defaultValue={total === null ? "" : total.toFixed(2)} aria-describedby="doc-total-nf" />
        <NotFound show={total === null && items.some((i) => i.name)} id="doc-total-nf" />
      </div>
    </>
  );
}
