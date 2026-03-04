<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# L'Écho 🕊️

*Compagnon de récit vocal intelligent et bienveillant pour les seniors*
</div>

---

## 🌟 À propos d'L'Écho

L'Écho est une application compagnon conçue pour briser l'isolement des seniors en utilisant la technologie de pointe du **Google Agent Development Kit (ADK)**. Plus qu'un simple assistant, c'est un confident qui écoute, se souvient et connecte l'utilisateur au monde moderne d'une manière naturelle et apaisante.

## ✨ Fonctionnalités Clés

### 🎙️ Interaction Vocale Multimodale

Basé sur l'API **Gemini Multimodal Live**, L'Écho offre une conversation fluide, capable de détecter les émotions et d'adapter son ton pour une expérience humaine et chaleureuse.

### 🌐 Intelligence Atlas (Google Search Grounding)

L'agent est capable d'effectuer des recherches sur le web de manière autonome. Qu'il s'agisse de l'actualité, de la météo ou d'articles de presse, Echo affiche des résultats riches et visuels sur une interface **Premium** tout en résumant l'information à l'oral.

### 📧 Communication Connectée (AgentMail)

Intégration native de la technologie **AgentMail via MCP** :

- **Envoi d'e-mails :** L'utilisateur peut dicter des messages à ses proches.
- **Consultation de boîte de réception :** L'Écho peut lire les nouveaux messages pour garder l'utilisateur informé de sa vie sociale.

### 🎵 Studio Médias

Recherche et lecture automatique de contenus YouTube ou musicaux pour accompagner les moments de détente ou illustrer un souvenir.

### 🧠 Mémoire Biographique

Echo sauvegarde les faits marquants et les anecdotes partagées par l'utilisateur pour construire une chronologie de vie et pouvoir y faire référence plus tard.

---

## 🚀 Installation & Utilisation

### Prérequis

- Node.js (v18+)
- Une clé API Google Gemini

### Configuration

1. Clonez le projet.
2. Installez les dépendances :

   ```bash
   npm install
   ```

3. Créez un fichier `.env.local` et configurez vos clés :

   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=votre_cle_gemini
   AGENTMAIL_API_KEY=votre_cle_agentmail (optionnel pour les mails réels)
   ```

### Lancement

```bash
npm run dev
```

---

## 🎨 Design Premium

L'interface a été conçue pour être à la fois lisible et esthétique, utilisant des techniques de **glassmorphism**, des animations fluides avec **Framer Motion** et un retour visuel immersif synchronisé sur la voix.

---
<p align="center">Propulsé par Google ADK & Gemini</p>
