import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/auth.js";
import { tripController } from "./trip.controller.js";

export async function tripRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);

  app.get("/", tripController.listTrips);
  app.post("/", tripController.createTrip);
  app.get("/:id", tripController.getTripDetail);
  app.put("/:id", tripController.updateTrip);
  app.delete("/:id", tripController.deleteTrip);

  app.post("/:id/travelers", tripController.inviteTraveler);
  app.delete("/:id/travelers/:userId", tripController.removeTraveler);

  app.post("/:id/minors", tripController.addMinor);

  app.post("/:id/generate-plan", tripController.generatePlan);
  app.post("/:id/ai-chat", tripController.aiChat);

  app.get("/:id/itinerary", tripController.getItinerary);
  app.put("/:id/itinerary/:dayId/:itemId", tripController.updateItineraryItem);

  app.get("/:id/bookings", tripController.listBookings);
  app.post("/:id/bookings", tripController.addBooking);
  app.put("/:id/bookings/:bookingId", tripController.updateBooking);

  app.get("/:id/checklist", tripController.getChecklist);
  app.post("/:id/checklist", tripController.addChecklistItem);
  app.patch("/:id/checklist/:itemId", tripController.toggleChecklistItem);

  app.post("/:id/expenses", tripController.addExpense);
  app.get("/:id/budget-summary", tripController.getBudgetSummary);

  app.post("/:id/whatsapp/sync", tripController.whatsappSync);
}
