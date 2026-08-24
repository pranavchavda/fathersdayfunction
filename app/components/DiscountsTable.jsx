import {
  Badge,
  BlockStack,
  Box,
  Card,
  IndexTable,
  InlineStack,
  Link,
  Text,
} from "@shopify/polaris";
import { CAPABILITY_BY_FUNCTION_ID } from "../lib/capabilities";

const STATUS_TONE = {
  ACTIVE: "success",
  SCHEDULED: "attention",
  EXPIRED: undefined,
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * @param {{
 *   discounts: Array<any>,
 *   adminUrlFor: (id: string) => string,
 *   title?: string,
 *   emptyMessage?: string,
 *   showFunction?: boolean,
 * }} props
 */
export function DiscountsTable({
  discounts,
  adminUrlFor,
  title = "App discounts",
  emptyMessage = "No discounts have been created with this app yet.",
  showFunction = true,
}) {
  const headings = [
    { title: "Discount" },
    { title: "Type" },
    ...(showFunction ? [{ title: "Function" }] : []),
    { title: "Status" },
    { title: "Starts" },
    { title: "Ends" },
  ];

  return (
    <Card padding="0">
      <Box padding="400" paddingBlockEnd="200">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            {title}
          </Text>
          <Text as="span" tone="subdued" variant="bodySm">
            {discounts.length} total ·{" "}
            {discounts.filter((d) => d.status === "ACTIVE").length} active
          </Text>
        </InlineStack>
      </Box>
      {discounts.length === 0 ? (
        <Box padding="400" paddingBlockStart="0">
          <Text as="p" tone="subdued">
            {emptyMessage}
          </Text>
        </Box>
      ) : (
        <IndexTable
          resourceName={{ singular: "discount", plural: "discounts" }}
          itemCount={discounts.length}
          headings={headings}
          selectable={false}
        >
          {discounts.map((d, index) => {
            const capability = CAPABILITY_BY_FUNCTION_ID[d.functionId];
            return (
              <IndexTable.Row id={d.id} key={d.id} position={index}>
                <IndexTable.Cell>
                  <BlockStack gap="050">
                    <Link url={adminUrlFor(d.id)} target="_blank" removeUnderline>
                      <Text as="span" fontWeight="semibold">
                        {d.title}
                      </Text>
                    </Link>
                    {d.codes.length > 0 && (
                      <Text as="span" variant="bodySm" tone="subdued">
                        Code: {d.codes.join(", ")}
                        {d.usageCount != null ? ` · used ${d.usageCount}×` : ""}
                      </Text>
                    )}
                  </BlockStack>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {d.method === "code" ? "Code" : "Automatic"}
                </IndexTable.Cell>
                {showFunction && (
                  <IndexTable.Cell>
                    {capability?.route ? (
                      <Link url={capability.route} removeUnderline>
                        {capability.shortTitle}
                      </Link>
                    ) : (
                      d.functionTitle
                    )}
                  </IndexTable.Cell>
                )}
                <IndexTable.Cell>
                  <Badge tone={STATUS_TONE[d.status]}>
                    {d.status.charAt(0) + d.status.slice(1).toLowerCase()}
                  </Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>{formatDate(d.startsAt)}</IndexTable.Cell>
                <IndexTable.Cell>{formatDate(d.endsAt)}</IndexTable.Cell>
              </IndexTable.Row>
            );
          })}
        </IndexTable>
      )}
    </Card>
  );
}
