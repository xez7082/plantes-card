# 🌿 Gestion des Plantes - Glassmorphism Edition
### Créé par **xez7082**

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Une carte Home Assistant ultra-moderne utilisant le design **Glassmorphism** (effet de verre dépoli) pour suivre la santé de vos plantes. Cette carte est optimisée pour fonctionner exclusivement avec les données issues de l'intégration **OpenPlantbook**.

---

## ✨ Caractéristiques

* 🧪 **Style Glassmorphism** : Interface élégante avec flou d'arrière-plan, bordures lumineuses et dégradés.
* 🇫🇷 **100% Français** : Tous les labels sont traduits nativement (Humidité Sol, Engrais, DLI, etc.).
* 🌍 **Exclusivité OpenPlantbook** : Utilise les seuils scientifiques (min/max) et les images haute définition de la base de données mondiale.
* 🚨 **Alertes Visuelles** : Les barres de progression passent en rouge automatiquement si les besoins de la plante ne sont pas respectés.
* ⚙️ **Éditeur Visuel (GUI)** : Configuration facile sans YAML grâce au sélecteur d'entité intégré.

---

## 📸 Aperçu
> *La carte s'adapte à votre fond d'écran grâce à sa transparence et son effet de flou dynamique.*

---

## 🚀 Installation

### Via HACS (Recommandé)
1. Ouvrez **HACS** dans votre instance Home Assistant.
2. Cliquez sur les **3 points** en haut à droite et choisissez **Dépôts personnalisés**.
3. Ajoutez l'URL de ce dépôt : `https://github.com/VOTRE_NOM_UTILISATEUR/gestion-plantes-card`
4. Sélectionnez la catégorie **Lovelace**.
5. Cliquez sur **Installer**.
6. Redémarrez ou rafraîchissez votre interface.

### Manuelle
1. Téléchargez le fichier `gestion-plantes-card.js` dans le dossier `www` de votre configuration.
2. Ajoutez la ressource dans votre tableau de bord :
   ```yaml
   url: /local/gestion-plantes-card.js
   type: module
