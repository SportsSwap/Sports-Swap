# SportsSwap — App Store Submission Pack

Everything you need to copy-paste into App Store Connect when submitting.

---

## App Information

| Field | Value |
|---|---|
| **App name** | SportsSwap |
| **Subtitle** (30 chars max) | Buy, sell & connect in sport |
| **Bundle ID** | com.sportsswap.app |
| **Primary category** | Shopping |
| **Secondary category** | Sports |
| **Age rating** | 17+ (recommended — has user-generated content and chat; see Age Rating answers below) |
| **Price** | Free |
| **Support email** | SportsMACKAY@gmail.com |

## Promotional Text (170 chars max)

> Gear up for less. Buy and sell quality sports equipment near you, and join a community of athletes who love your sport as much as you do.

## Description

> **SportsSwap is the marketplace and community built just for sport.**
>
> Outgrown your footy boots? Upgrading your tennis racquet? Don't let good gear gather dust — list it on SportsSwap in seconds and pass it on to someone who'll love it.
>
> **THE MARKETPLACE**
> • List gear in seconds — snap a photo, set a price, done
> • Browse 20+ sports: football, AFL, rugby, basketball, cricket, tennis, swimming, snow sports and more
> • Chat with buyers and sellers directly in the app
> • Save items you love and manage your own listings
> • Real seller ratings so you know who you're dealing with
>
> **THE COMMUNITY**
> • Share posts, questions and achievements with fellow athletes
> • Join discussion groups for your sport, your club or your team
> • Create private groups with join codes for your squad
> • Group events with RSVPs, announcements and training times
> • Follow other athletes and build your sporting network
>
> **MADE FOR EVERY ATHLETE**
> Whether you're a weekend warrior, a club regular, or a parent kitting out fast-growing kids — SportsSwap keeps quality gear in the game and out of landfill.
>
> Download SportsSwap and join your sporting community today.

## Keywords (100 chars max)

```
sports,gear,secondhand,buy,sell,marketplace,equipment,football,community,team,club,used,swap
```

## What's New (first release)

> Welcome to SportsSwap 1.0! Buy and sell sports gear, join community groups, chat with other athletes, and more. This is just the beginning — we'd love your feedback at SportsMACKAY@gmail.com.

---

## Age Rating questionnaire — key answers

- Unrestricted web access: **No**
- User-generated content: **Yes** (posts, listings, chat)
- Does the app have content moderation (report/block/filter)? **Yes** — profanity filter, report buttons on all content, user blocking, community guidelines, zero-tolerance policy shown at sign-up
- Gambling, contests: **No**

## App Privacy ("nutrition label") answers

Data collected, all **linked to the user's identity**, used only for **App Functionality** (none used for tracking, none shared with third parties):

| Data type | Collected? | Notes |
|---|---|---|
| Email address | Yes | Account sign-in (Firebase Auth) |
| Name (username) | Yes | Public profile |
| Photos | Yes | Only photos the user chooses to upload |
| User content (posts, messages, listings) | Yes | Core app function |
| Purchase history | No | Payments happen outside the app |
| Location | No | Users type their suburb manually |
| Contacts, browsing history, identifiers for tracking | No | |

Tracking (ATT): **No tracking** — the app does not track users across other companies' apps/websites.

## App Review notes (paste into "Notes" for the reviewer)

> SportsSwap is a sports gear marketplace with a community section.
>
> Test account: [CREATE A TEST ACCOUNT AND PUT EMAIL/PASSWORD HERE — Apple requires one]
>
> UGC moderation: every post, listing and user can be reported (reports go to our moderation queue); any user can be blocked (hides all their content); a profanity filter blocks offensive language before posting; users agree to zero-tolerance terms at sign-up; accounts can be deleted in Settings.
>
> Buying/selling is arranged between users directly (like classifieds) — no payments are processed in the app.

---

## Still TO DO before submitting

1. **App icon** — open `icon-generator.html` (in the repo root) in a browser, download the 1024×1024 PNG, add it to the Xcode asset catalog (`Images.xcassets > AppIcon`).
2. **Screenshots** — run the app in the iOS Simulator on these sizes and press Cmd+S to save screenshots:
   - 6.9" (iPhone 16 Pro Max) — required
   - 6.5" (iPhone 11 Pro Max / 14 Plus) — required
   Take 4–6: marketplace grid, a listing detail, community feed, a group page, chat, dark mode.
3. **Privacy Policy URL** — Apple requires a public URL (in-app text isn't enough). Easiest: enable GitHub Pages on the repo and serve a `privacy.html`, or use a free Google Site. The text is already written in `Settings.tsx` (PRIVACY constant).
4. **Test account** — create one (e.g. reviewer@sportsswap.test) and fill it into the Review notes above.
5. **Apple Developer Program** — $99 USD/year membership needed to submit ($A150ish).
