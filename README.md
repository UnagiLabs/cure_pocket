# cure_pocket
Walrus haulout hackathon

Walrus haulout hackathon

# CurePocket – A Global, Privacy-Preserving Medication Passport

CurePocket is a **global medication passport** designed for a world where people move, travel, and live across borders.

It is a **patient-owned, privacy-preserving medication management system** powered by Walrus, Seal, and Sui.

With CurePocket, users can:
- Store all medications (Rx, OTC, supplements, herbal) in one secure pocket  
- Encrypt and save data safely on Walrus  
- Control access through Seal-based key management  
- Manage medication entries, consent, and analytics via Sui’s object model  
- Share medication history with clinicians only when they approve (QR / time-limited link)  
- Opt-in to share fully anonymized datasets for research and receive **data rewards**  

CurePocket combines:
**the simplicity of a personal medication notebook,  
the rigor of global health data standards,  
and the privacy guarantees of decentralized technology.**

---

# 1. Problem

Medication information is globally fragmented.

- Paper medication notebooks  
- Pharmacy systems  
- Hospital EHRs  
- Personal notes  
- OTC/supplement use rarely documented  
- No consistent “trusted medication list” across providers or countries  
- Travelers and international patients often cannot provide reliable medication histories

At the same time, anonymized real-world medication data is highly valuable for:

- Drug safety (pharmacovigilance)  
- New drug development  
- Adherence and real-world usage patterns  
- Public health research  

But today, **this value is captured by centralized platforms**,  
and **patients receive no benefit**, while their privacy is at risk.

Two fundamental problems remain unsolved worldwide:

1. **There is no globally portable, patient-held medication passport.**  
2. **The value of health data rarely returns to the patient.**

---

# 2. Vision

CurePocket’s vision is a simple but powerful world:

- Every person carries a **global medication passport**, usable anywhere  
- Patients **own and control their data**, including who may view it and when  
- Emergency and travel situations are safe: medication history can be shown in English instantly  
- Fully anonymized population-level data can power research, safely and ethically  
- Value generated from analytics is **shared back with the patients**  
- Data formats follow global standards (HL7 FHIR, ATC/RxNorm)  
- Walrus + Seal + Sui provide an open, verifiable, and privacy-preserving foundation  

In short:

> **A global, decentralized, patient-held medication passport that empowers people and protects privacy.**

---

# 3. Solution Overview

CurePocket consists of **two separated layers**:

---

## 🩺 Care Layer (Personal Health Management)

- Add medications via QR, barcode, or manual entry  
- Track current meds, discontinued meds, and side effects  
- All data is **encrypted** and stored on Walrus  
- Clinicians can view it **only when the patient grants access** (via QR / time-limited token)  
- Generate a **travel-ready emergency medication card (PDF + QR)** in English  

---

## Analytics Layer (Anonymous Data Economy)

- Uses only **fully anonymized, aggregated** medication data  
- Includes age band, country/region, drug classes (ATC), adherence patterns  
- Researchers and companies can purchase **non-reversible aggregated datasets**  
- Revenue flows into an on-chain `AnalyticsPool`  
- Patients receive **reward distributions** for opting in  

---

## Technical Foundation

- **Walrus:** encrypted, durable, content-addressed medication blobs  
- **Seal:** per-patient key management + time-limited decryption grants  
- **Sui:** on-chain objects for Vaults, Entries, ConsentTokens, and reward logic  

---

# 4. Why Walrus / Why Seal / Why Sui

## Why Walrus
- Secure, long-term storage for encrypted medication records  
- Quilt support enables incremental medication history updates  
- Content addressing guarantees immutability and verifiability  

## Why Seal
- Medical data requires strong cryptographic access control  
- Seal enables:
  - per-patient keys  
  - time-limited access for clinicians  
  - separation of decryption rights from backend services  
- Perfect fit for patient-controlled consent models  

## Why Sui
- Object-centric architecture matches healthcare concepts:
  - `MedicationVault`  
  - `MedicationEntry`  
  - `SymptomLog`  
  - `ConsentToken`  
  - `AnalyticsPool`  
- Native ownership and access guarantees  
- Low latency UX for clinical and user-facing flows  

---

# 5. Architecture Diagram (text-based)

```

Frontend (QR, Barcode, UI)
↓
Encrypt FHIR-like JSON
↓
Walrus (encrypted blobs / quilts)
↓
Sui (MedicationVault, Entries, ConsentToken, AnalyticsPool)
↓
Seal (key management & access control)

```

- Frontend → encrypt → Walrus  
- Sui stores metadata + ownership + consent  
- Seal handles keys and decryption rights  
- Analytics layer is **one-way anonymized aggregation only**

---

# 6. Data Privacy Model  
**Strict separation between Care Layer and Analytics Layer**

---

## 🩺 Care Layer (For clinical use)

- Full medication details  
- Side-effect logs  
- Access only by:
  - patient  
  - clinicians with a valid `ConsentToken`  
- Stored only as **encrypted Walrus blobs**  
- Never shared with third parties  

---

## Analytics Layer (For population insights)

- Non-identifiable aggregated data:
  - Age band  
  - Country  
  - Drug class (ATC)  
  - Usage/adherence trends  
- **Non-reversible** (cannot trace back to individuals)  
- Purchased by research institutions / companies  
- Revenue redistributed to patients via `AnalyticsPool`

---

# 7. Demo Flow

1. User connects wallet → initializes `MedicationVault`  
2. User adds a medication (QR/barcode/manual)  
3. App generates FHIR-like JSON → encrypts → stores on Walrus  
4. Creates `MedicationEntry` on Sui with blob ID and metadata  
5. User logs a side effect → stored the same way  
6. User generates an **Emergency Medication Card** (PDF + QR)  
7. Clinician scans QR → temporary `ConsentToken` issued on Sui  
8. Clinician sees read-only view of medications  
9. Analytics dashboard shows anonymized population patterns  
10. A mock purchase triggers patient reward distribution  

---

# 8. Future Work

- Full HL7 FHIR compliance  
- Global drug ontology support (ATC / RxNorm / YJ codes)  
- APIs for pharmacies/hospitals to push data directly  
- Advanced adherence analytics + safety signal detection  
- Multi-language UI  
- Offline “Travel Mode”  
- Verifiable Credentials for strong identity (optional)  
- GDPR / HIPAA–aligned privacy extensions  
- Partnerships with research institutions & public health orgs  

---

# 9. Team

**Shizuku –  Product Designer & Pharmacist**
- Licensed pharmacist with real-world experience in medication counseling, drug safety, and polypharmacy management  
- Leads product vision, UX design, and clinical accuracy  
- Designs CurePocket’s UI/UX, user flows, and global medication passport concept  
- Bridges medical practice with decentralized technology to ensure clinical relevance

**Butasan – Backend, Smart Contract & Security Engineer**
- Responsible for Sui smart contracts: MedicationVault, MedicationEntry, ConsentToken, AnalyticsPool  
- Implements backend logic, Walrus integration, and system architecture  
- Focuses on security, encryption workflow, and data integrity  
- Ensures robust, scalable, privacy-preserving infrastructure

Together, we combine **medical expertise + user-centered design + secure decentralized engineering**  
to build CurePocket as a globally usable, privacy-first medication passport.



---

