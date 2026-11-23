import { describe, expect, it } from "vitest";
import { groupOrders, orderStage, stageHint, stageLabel } from "@/lib/order-groups";

describe("orderStage", () => {
  it("puts a delivered order that the customer has not closed first", () => {
    expect(orderStage({ status: "fulfilled", shipments: [{ status: "in_transit" }, { status: "delivered" }] })).toBe("awaiting_confirmation");
    expect(orderStage({ status: "paid", shipments: [{ status: "delivered" }] })).toBe("awaiting_confirmation");
  });

  it("keeps paid or shipped orders in progress", () => {
    expect(orderStage({ status: "paid", shipments: [{ status: "confirmed" }] })).toBe("in_progress");
    expect(orderStage({ status: "fulfilled", shipments: [{ status: "out_for_delivery" }] })).toBe("in_progress");
    expect(orderStage({ status: "paid" })).toBe("in_progress");
    expect(orderStage({ status: "pending", shipments: null })).toBe("in_progress");
  });

  it("closes completed orders and sets cancelled and refunded apart", () => {
    expect(orderStage({ status: "completed", shipments: [{ status: "completed" }] })).toBe("closed");
    expect(orderStage({ status: "cancelled", shipments: [{ status: "cancelled" }] })).toBe("cancelled");
    expect(orderStage({ status: "refunded" })).toBe("cancelled");
  });
});

describe("groupOrders", () => {
  const orders = [
    { id: "a", status: "completed" },
    { id: "b", status: "paid", shipments: [{ status: "delivered" }] },
    { id: "c", status: "paid", shipments: [{ status: "preparing" }] },
    { id: "d", status: "paid", shipments: [{ status: "confirmed" }] },
  ];

  it("orders the groups by urgency and keeps the incoming order inside each", () => {
    const groups = groupOrders(orders);
    expect(groups.map((group) => group.stage)).toEqual(["awaiting_confirmation", "in_progress", "closed"]);
    expect(groups[1].orders.map((order) => order.id)).toEqual(["c", "d"]);
  });

  it("leaves out the groups that have nothing", () => {
    expect(groupOrders([])).toEqual([]);
    expect(groupOrders([{ status: "cancelled" }]).map((group) => group.stage)).toEqual(["cancelled"]);
  });
});

describe("labels", () => {
  it("names every stage in both languages", () => {
    expect(stageLabel("awaiting_confirmation", "es")).toBe("Entregados, por confirmar");
    expect(stageLabel("in_progress", "en")).toBe("In progress");
    expect(stageHint("awaiting_confirmation", "es")).toContain("Confirma");
    expect(stageHint("cancelled", "es")).toBe("");
  });
});
