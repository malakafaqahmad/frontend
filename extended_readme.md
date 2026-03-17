## Setup and running

This project is split across three repositories: frontend (React + Vite), backend (Flask), and the model (Jupyter notebook).

Prerequisites
- Git
- Node.js (>=16) and npm or pnpm
- Python 3.8+ and pip
- Optional: `virtualenv` / `venv` and `jupyter`

Frontend (React + Vite)

Clone and run the frontend:

```bash
git clone https://github.com/malakafaqahmad/frontend.git
cd frontend
npm install
npm run dev
```

Backend (Flask)

Clone and run the backend API:

```bash
git clone https://github.com/malakafaqahmad/hackkBE.git
cd hackkBE
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Model (Jupyter notebook)

Clone and open the model notebook:

```bash
git clone https://github.com/malakafaqahmad/medgemma_model_endpoint.git
cd medgemma_model_endpoint
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
jupyter notebook
# Open the notebook in your browser and run the cells
```

Links
- Frontend: https://github.com/malakafaqahmad/frontend.git
- Backend: https://github.com/malakafaqahmad/hackkBE.git
- Model notebook: https://github.com/malakafaqahmad/medgemma_model_endpoint.git


## Video Elaboration

Initially, Patient 2 (P2) was selected, after which the backend system automatically retrieved and loaded the relevant Electronic Health Record (EHR) associated with P2. The GPT model was then configured to simulate a patient presenting symptoms consistent with Stable Angina. During the interaction, the model followed a four-phase diagnostic framework to evaluate the clinical interview. Based on the collected information and analysis, the system successfully identified the condition as Stable Angina, achieving 100% diagnostic accuracy in this case.

To evaluate the predictive efficacy of the MedGemma-powered Digital Twin (DT), we conducted a 7-day simulation using longitudinal data representing a patient (Patient 2) in a state of progressive physiological deterioration. Utilizing a Chain-of-Agents (CoA) architecture, the system autonomously processed heterogeneous daily telemetry—fusing vital signs, nutritional intake, and medication adherence to establish distilled EHRMem memory profiles. By executing high-fidelity temporal reasoning, the Manager Agent successfully projected future clinical risk trajectories and triggered automated alerts 24–48 hours prior to a simulated catastrophic event. This validation demonstrated the system's capacity for longitudinal persistence and reasoning accuracy when handling complex, noisy patient histories.

- video link: https://youtu.be/RxRuJ5xIayU