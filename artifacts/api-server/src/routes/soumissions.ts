import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.post("/soumissions", (req, res) => {
  const { prenom, age, ville, courriel, telephone, raconte } = req.body;

  logger.info(
    { prenom, age, ville, courriel, telephone: telephone || null, raconte: raconte || null },
    "Nouvelle soumission P'tits Artistes reçue"
  );

  logger.info(
    { to: courriel, subject: "Confirmation de soumission — Gaminet Gamin GG" },
    "[PLACEHOLDER EMAIL] Courriel de confirmation envoyé au parent via Resend/SendGrid"
  );

  logger.info(
    { to: "soumissions@gaminetgamin.ca", subject: `Nouvelle soumission de ${prenom}, ${age} ans` },
    "[PLACEHOLDER EMAIL] Notification interne envoyée à l'équipe GG"
  );

  res.status(201).json({
    success: true,
    message: "Soumission reçue avec succès",
    data: { prenom, age, ville },
  });
});

export default router;
