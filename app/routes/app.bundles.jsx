import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Divider,
  IndexTable,
  InlineStack,
  Link,
  Modal,
  Text,
  TextField,
  Thumbnail,
  useIndexResourceState,
} from "@shopify/polaris";
import { useAppBridge } from "@shopify/app-bridge-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticate } from "../shopify.server";
import { CapabilityPage } from "../components/CapabilityPage";
import { BUNDLE_TAG, METAFIELDS, usSameAsDefault } from "../lib/bundles";
import { applyBundle, fetchBundleParents, removeBundle } from "../lib/bundles.server";

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const products = await fetchBundleParents(admin);
  return json({ shop: session.shop, products });
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  const parse = (key, fallback) => {
    try {
      const v = JSON.parse(formData.get(key) ?? "");
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

  const productIds = parse("productIds", []).filter(
    (id) => typeof id === "string" && id.startsWith("gid://shopify/Product/")
  );
  if (productIds.length === 0) {
    return json({ intent, errors: ["Pick at least one product."] });
  }

  try {
    if (intent === "remove") {
      const result = await removeBundle(admin, productIds);
      return json({ intent, ...result });
    }

    if (intent === "apply") {
      const cleanGifts = (key) =>
        parse(key, [])
          .filter((g) => g?.id?.startsWith?.("gid://shopify/ProductVariant/"))
          .map((g) => ({
            id: g.id,
            quantity: Math.max(1, Math.min(2000, parseInt(g.quantity, 10) || 1)),
          }));
      const cleanIds = (key) =>
        parse(key, []).filter((id) => id?.startsWith?.("gid://shopify/ProductVariant/"));

      const gifts = cleanGifts("gifts");
      const choiceIds = cleanIds("choiceIds");
      // US-market set: either a copy of the default set or its own lists
      // (empty = no gift for US carts).
      const us =
        formData.get("usSame") === "true"
          ? { gifts, choiceIds }
          : { gifts: cleanGifts("usGifts"), choiceIds: cleanIds("usChoiceIds") };

      const empty = (set) => set.gifts.length === 0 && set.choiceIds.length === 0;
      if (empty({ gifts, choiceIds }) && empty(us)) {
        return json({
          intent,
          errors: [
            "Add at least one free item or one customer choice (or use “Remove bundle”).",
          ],
        });
      }
      const result = await applyBundle(admin, { productIds, gifts, choiceIds, us });
      return json({ intent, ...result });
    }

    return json({ intent, errors: [`Unknown action “${intent}”.`] });
  } catch (err) {
    return json({ intent, errors: [err?.message || String(err)] });
  }
};

/* ------------------------------------------------------------------ */
/* Client helpers                                                      */
/* ------------------------------------------------------------------ */

async function pick(shopify, options) {
  try {
    return await shopify.resourcePicker(options);
  } catch (err) {
    shopify.toast.show(`Picker failed: ${err?.message || err}`, { isError: true });
    return null;
  }
}

function variantLabel(v) {
  if (!v) return "";
  return v.displayName || [v.product?.title, v.title].filter(Boolean).join(" – ") || v.id;
}

function ResultBanner({ data, onDismiss }) {
  if (!data) return null;
  const errors = data.errors || [];
  if (errors.length > 0) {
    return (
      <Banner title="Nothing was changed" tone="critical" onDismiss={onDismiss}>
        <ul>
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </Banner>
    );
  }
  const verb = data.intent === "remove" ? "Removed the bundle from" : "Applied the bundle to";
  return (
    <Banner tone="success" onDismiss={onDismiss}>
      <p>
        {verb} {data.count} product{data.count === 1 ? "" : "s"}. Carts pick
        the change up on their next update; the storefront may cache product
        data for a few minutes.
      </p>
    </Banner>
  );
}

/** Editable list of always-added free items with a per-unit quantity. */
function GiftsSection({ title, emptyText, gifts, setGifts, onPick, busy }) {
  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          {title}
        </Text>
        <Button onClick={onPick} disabled={busy}>
          {gifts.length ? "Change items" : "Pick variants"}
        </Button>
      </InlineStack>
      {gifts.length === 0 ? (
        <Text as="p" tone="subdued">
          {emptyText}
        </Text>
      ) : (
        <BlockStack gap="200">
          {gifts.map((g) => (
            <InlineStack key={g.id} gap="300" blockAlign="center" wrap={false}>
              <Box width="120px">
                <TextField
                  label="Qty per unit"
                  labelHidden
                  type="number"
                  min={1}
                  max={2000}
                  value={String(g.quantity)}
                  onChange={(value) =>
                    setGifts((prev) =>
                      prev.map((x) =>
                        x.id === g.id
                          ? { ...x, quantity: Math.max(1, parseInt(value, 10) || 1) }
                          : x
                      )
                    )
                  }
                  autoComplete="off"
                  suffix="×"
                />
              </Box>
              <Text as="span">{g.label}</Text>
              <Button
                variant="plain"
                tone="critical"
                onClick={() => setGifts((prev) => prev.filter((x) => x.id !== g.id))}
              >
                Remove
              </Button>
            </InlineStack>
          ))}
        </BlockStack>
      )}
    </BlockStack>
  );
}

/** List of variants the shopper may pick ONE of. */
function ChoicesSection({ title, emptyText, choices, setChoices, onPick, busy }) {
  return (
    <BlockStack gap="200">
      <InlineStack align="space-between" blockAlign="center">
        <Text as="h3" variant="headingSm">
          {title}
        </Text>
        <InlineStack gap="200">
          {choices.length > 0 && (
            <Button variant="plain" tone="critical" onClick={() => setChoices([])}>
              Clear
            </Button>
          )}
          <Button onClick={onPick} disabled={busy}>
            {choices.length ? "Change choices" : "Pick variants"}
          </Button>
        </InlineStack>
      </InlineStack>
      {choices.length === 0 ? (
        <Text as="p" tone="subdued">
          {emptyText}
        </Text>
      ) : (
        <InlineStack gap="200" wrap>
          {choices.map((c) => (
            <Badge key={c.id} tone="info">
              {c.label}
            </Badge>
          ))}
        </InlineStack>
      )}
    </BlockStack>
  );
}

/** Table cell summarising a row's US-market set. */
function UsCell({ row }) {
  const us = row.us || { gifts: [], choices: [] };
  if (us.gifts.length === 0 && us.choices.length === 0) {
    return (
      <Text as="span" tone="subdued">
        No US gift
      </Text>
    );
  }
  if (usSameAsDefault(row)) return <Text as="span">Same as default</Text>;
  return (
    <>
      {us.gifts.map((g) => (
        <div key={g.id}>
          {g.quantity} × {g.label}
        </div>
      ))}
      {us.choices.length > 0 && (
        <div>
          <Text as="span" tone="subdued">
            Pick one:{" "}
          </Text>
          {us.choices.map((c) => c.label).join(" / ")}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function BundlesPage() {
  const { shop, products: loaderProducts } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const [selectedProducts, setSelectedProducts] = useState([]); // [{id,title}]
  const [gifts, setGifts] = useState([]); // [{id,label,quantity}]
  const [choices, setChoices] = useState([]); // [{id,label}]
  // US-market set. While `usSame` is on, the default set is written to the
  // _us metafields too; off = the two lists below (both empty = no US gift).
  const [usSame, setUsSame] = useState(true);
  const [usGifts, setUsGifts] = useState([]);
  const [usChoices, setUsChoices] = useState([]);
  const [result, setResult] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const busy = fetcher.state !== "idle";

  // The table is driven by a tag search that lags Shopify's search index by
  // a few seconds; overlay the rows the last action touched so the list is
  // right immediately (the loader catches up on the next navigation).
  const products = useMemo(() => {
    if (!result || result.errors?.length) return loaderProducts;
    if (result.intent === "remove") {
      const gone = new Set(result.removedIds || []);
      return loaderProducts.filter((p) => !gone.has(p.id));
    }
    const fresh = result.products || [];
    const freshIds = new Set(fresh.map((p) => p.id));
    return [...fresh, ...loaderProducts.filter((p) => !freshIds.has(p.id))].sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [result, loaderProducts]);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      setResult(fetcher.data);
      if (!fetcher.data.errors?.length) {
        setConfirmRemove(false);
        shopify.toast.show(
          fetcher.data.intent === "remove" ? "Bundle removed" : "Bundle applied"
        );
      }
    }
  }, [fetcher.state, fetcher.data, shopify]);

  /* ---- pickers ---- */
  const pickProducts = useCallback(async () => {
    const picked = await pick(shopify, {
      type: "product",
      multiple: true,
      action: "select",
      selectionIds: selectedProducts.map((p) => ({ id: p.id })),
    });
    if (!picked) return;
    setSelectedProducts(picked.map((p) => ({ id: p.id, title: p.title })));
  }, [shopify, selectedProducts]);

  // Variant pickers open without preselection: App Bridge's selectionIds
  // shape for variants ({id: product, variants: [...]}) isn't worth the risk
  // of a rejected call for a nicety.
  const pickGiftsInto = useCallback(
    async (setter) => {
      const picked = await pick(shopify, {
        type: "variant",
        multiple: true,
        action: "select",
      });
      if (!picked) return;
      setter((prev) =>
        picked.map((v) => ({
          id: v.id,
          label: variantLabel(v),
          quantity: prev.find((g) => g.id === v.id)?.quantity ?? 1,
        }))
      );
    },
    [shopify]
  );

  const pickChoicesInto = useCallback(
    async (setter) => {
      const picked = await pick(shopify, {
        type: "variant",
        multiple: true,
        action: "select",
      });
      if (!picked) return;
      setter(picked.map((v) => ({ id: v.id, label: variantLabel(v) })));
    },
    [shopify]
  );

  /* ---- table ---- */
  const resourceName = { singular: "product", plural: "products" };
  const { selectedResources, allResourcesSelected, handleSelectionChange, clearSelection } =
    useIndexResourceState(products);

  const selectedRows = useMemo(
    () => products.filter((p) => selectedResources.includes(p.id)),
    [products, selectedResources]
  );

  const loadIntoForm = (rows) => {
    const first = rows[0];
    setSelectedProducts(rows.map((p) => ({ id: p.id, title: p.title })));
    setGifts(
      (first?.gifts || []).map((g) => ({
        id: g.id,
        label: g.label,
        quantity: g.quantity,
      }))
    );
    setChoices((first?.choices || []).map((c) => ({ id: c.id, label: c.label })));
    const same = first ? usSameAsDefault(first) : true;
    setUsSame(same);
    setUsGifts(
      same
        ? []
        : (first?.us?.gifts || []).map((g) => ({
            id: g.id,
            label: g.label,
            quantity: g.quantity,
          }))
    );
    setUsChoices(
      same ? [] : (first?.us?.choices || []).map((c) => ({ id: c.id, label: c.label }))
    );
    setResult(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = (intent, productIds) => {
    fetcher.submit(
      {
        intent,
        productIds: JSON.stringify(productIds),
        gifts: JSON.stringify(gifts.map((g) => ({ id: g.id, quantity: g.quantity }))),
        choiceIds: JSON.stringify(choices.map((c) => c.id)),
        usSame: String(usSame),
        usGifts: JSON.stringify(usGifts.map((g) => ({ id: g.id, quantity: g.quantity }))),
        usChoiceIds: JSON.stringify(usChoices.map((c) => c.id)),
      },
      { method: "POST" }
    );
  };

  const hasDefaultSet = gifts.length > 0 || choices.length > 0;
  const hasUsSet = usSame ? hasDefaultSet : usGifts.length > 0 || usChoices.length > 0;
  const canApply = selectedProducts.length > 0 && (hasDefaultSet || hasUsSet) && !busy;

  const adminProductUrl = (id) =>
    `https://${shop}/admin/products/${id.split("/").pop()}`;

  return (
    <CapabilityPage
      capabilityKey="bundles"
      aside={
        <Card>
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              Rollout tip
            </Text>
            <Text as="p" variant="bodySm">
              Pick every machine in the promo at once, add the free items and the
              flavour choices, then Apply. Each product gets the
              <code> custom.bundle_*</code> metafields (plus their <code>_us</code>{" "}
              twins for the US market) and the <code>{BUNDLE_TAG}</code>{" "}
              tag (which is how this page finds them again).
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Products edited straight in the product admin will not show here
              unless they also carry the tag.
            </Text>
          </BlockStack>
        </Card>
      }
    >
      <BlockStack gap="400">
        <ResultBanner data={result} onDismiss={() => setResult(null)} />

        {/* ---------------- Apply form ---------------- */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Apply a bundle
            </Text>

            <BlockStack gap="200">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingSm">
                  Products (bundle parents)
                </Text>
                <Button onClick={pickProducts} disabled={busy}>
                  {selectedProducts.length ? "Change products" : "Pick products"}
                </Button>
              </InlineStack>
              {selectedProducts.length === 0 ? (
                <Text as="p" tone="subdued">
                  No products picked yet — e.g. every espresso machine that ships
                  with free coffee.
                </Text>
              ) : (
                <InlineStack gap="200" wrap>
                  {selectedProducts.map((p) => (
                    <Badge key={p.id}>{p.title}</Badge>
                  ))}
                </InlineStack>
              )}
            </BlockStack>

            <Divider />

            <Text as="h3" variant="headingMd">
              Canada &amp; all other markets
            </Text>
            <GiftsSection
              title="Free items (always added, at $0)"
              emptyText="None — e.g. 2 × Essential Espresso."
              gifts={gifts}
              setGifts={setGifts}
              onPick={() => pickGiftsInto(setGifts)}
              busy={busy}
            />
            <ChoicesSection
              title="Customer picks one of (optional, at $0)"
              emptyText="None — e.g. Sweetbird Vanilla / Caramel / Hazelnut. The storefront shows a picker in the cart; the chosen one joins the bundle."
              choices={choices}
              setChoices={setChoices}
              onPick={() => pickChoicesInto(setChoices)}
              busy={busy}
            />

            <Divider />

            <Text as="h3" variant="headingMd">
              United States market
            </Text>
            <Checkbox
              label="Same gifts as above"
              helpText="US carts only ever get the US set. Untick to give US shoppers different gifts — or leave both US lists empty for no US gift."
              checked={usSame}
              onChange={setUsSame}
              disabled={busy}
            />
            {!usSame && (
              <>
                <GiftsSection
                  title="US free items (always added, at $0)"
                  emptyText="None — US carts get no fixed free item."
                  gifts={usGifts}
                  setGifts={setUsGifts}
                  onPick={() => pickGiftsInto(setUsGifts)}
                  busy={busy}
                />
                <ChoicesSection
                  title="US customer picks one of (optional, at $0)"
                  emptyText="None — no US flavour choice."
                  choices={usChoices}
                  setChoices={setUsChoices}
                  onPick={() => pickChoicesInto(setUsChoices)}
                  busy={busy}
                />
              </>
            )}

            <InlineStack gap="200">
              <Button
                variant="primary"
                onClick={() => submit("apply", selectedProducts.map((p) => p.id))}
                disabled={!canApply}
                loading={busy && fetcher.formData?.get("intent") === "apply"}
              >
                Apply to {selectedProducts.length || ""} product
                {selectedProducts.length === 1 ? "" : "s"}
              </Button>
              <Button
                onClick={() => {
                  setSelectedProducts([]);
                  setGifts([]);
                  setChoices([]);
                  setUsSame(true);
                  setUsGifts([]);
                  setUsChoices([]);
                  setResult(null);
                }}
                disabled={busy}
              >
                Clear form
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* ---------------- Configured products ---------------- */}
        <Card padding="0">
          <Box padding="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text as="h2" variant="headingMd">
                Products with a bundle ({products.length})
              </Text>
              {selectedRows.length > 0 && (
                <ButtonGroup>
                  <Button onClick={() => loadIntoForm(selectedRows)} disabled={busy}>
                    Load into form
                  </Button>
                  <Button
                    tone="critical"
                    onClick={() => setConfirmRemove(true)}
                    disabled={busy}
                  >
                    Remove bundle
                  </Button>
                </ButtonGroup>
              )}
            </InlineStack>
          </Box>
          <IndexTable
            resourceName={resourceName}
            itemCount={products.length}
            selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
            onSelectionChange={handleSelectionChange}
            headings={[
              { title: "Product" },
              { title: "Free items" },
              { title: "Customer choice" },
              { title: "US market" },
              { title: "Status" },
            ]}
            emptyState={
              <Box padding="400">
                <Text as="p" tone="subdued">
                  No products carry the {BUNDLE_TAG} tag yet. Apply a bundle above.
                </Text>
              </Box>
            }
          >
            {products.map((p, index) => (
              <IndexTable.Row
                id={p.id}
                key={p.id}
                position={index}
                selected={selectedResources.includes(p.id)}
              >
                <IndexTable.Cell>
                  <InlineStack gap="300" blockAlign="center" wrap={false}>
                    <Thumbnail size="small" source={p.image || ""} alt="" />
                    <Link url={adminProductUrl(p.id)} target="_blank" removeUnderline>
                      {p.title}
                    </Link>
                  </InlineStack>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {p.gifts.length === 0 ? (
                    <Text as="span" tone="subdued">
                      —
                    </Text>
                  ) : (
                    p.gifts.map((g) => (
                      <div key={g.id}>
                        {g.quantity} × {g.label}
                      </div>
                    ))
                  )}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {p.choices.length === 0 ? (
                    <Text as="span" tone="subdued">
                      —
                    </Text>
                  ) : (
                    p.choices.map((c) => <div key={c.id}>{c.label}</div>)
                  )}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <UsCell row={p} />
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge tone={p.status === "ACTIVE" ? "success" : undefined}>
                    {p.status}
                  </Badge>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        </Card>
      </BlockStack>

      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Remove the bundle from ${selectedRows.length} product${
          selectedRows.length === 1 ? "" : "s"
        }?`}
        primaryAction={{
          content: "Remove bundle",
          destructive: true,
          loading: busy,
          onAction: () => {
            submit(
              "remove",
              selectedRows.map((p) => p.id)
            );
            clearSelection();
          },
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirmRemove(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            This deletes {METAFIELDS.map((m) => `custom.${m.key}`).join(", ")} on
            the selected products and removes the {BUNDLE_TAG} tag. The products
            themselves are untouched; carts stop bundling on their next update.
          </Text>
        </Modal.Section>
      </Modal>
    </CapabilityPage>
  );
}
