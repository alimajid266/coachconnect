# Phase 0 Manual Testing Guide

## Purpose

Choose the visual direction and confirm that CoachConnect's information, privacy decisions, and navigation are understandable before application development begins.

## Preview files

### Option A — Calm Athletic

`/home/ali/coachconnect/sketches/001-calm-athletic/index.html`

### Option B — Energetic Marketplace

`/home/ali/coachconnect/sketches/002-energetic-marketplace/index.html`

## How to open them

### Simplest method

1. Open the `coachconnect` folder in the file manager.
2. Open `sketches`.
3. Open one option folder.
4. Double-click `index.html`.
5. Repeat for the other option.

### Copy-paste terminal method

```bash
firefox /home/ali/coachconnect/sketches/001-calm-athletic/index.html
```

Then:

```bash
firefox /home/ali/coachconnect/sketches/002-energetic-marketplace/index.html
```

The preview photographs require an internet connection. The layout and written content still work if photographs do not load.

## Test A — Home page clarity

For each option:

1. Read only the first visible screen for ten seconds.
2. Decide whether it is immediately clear that this is a Pakistani sports-coaching marketplace.
3. Confirm the primary action is finding a coach.
4. Scroll through the complete page.

Expected:

- Pakistan and the coaching purpose are clear.
- Cricket, tennis, and strength are visible.
- PKR prices appear as `Rs` amounts.
- The page feels organized rather than crowded.
- No fake large statistics are shown.

## Test B — Search and filters

1. Enter `beginner cricket coach in Lahore` in the main search.
2. Press the search button.
3. Select Cricket, Tennis, and Strength filters one at a time.

Expected:

- A visible interpretation/status appears.
- Coach cards filter by sport.
- No invented coach appears.
- You can return to all coaches.

## Test C — Coach profile

1. Select `View profile` or `Profile →` on a coach card.
2. Read the service details.
3. Close using the `×` button.
4. Open it again and press the Escape key.

Expected:

- The profile opens visibly.
- It contains `What's included`, `What to bring`, `Facilities`, and `Not included`.
- Price is in PKR.
- Cancellation wording is visible.
- Email, personal phone number, home address, and exact GPS location are absent.
- Both close methods work.

## Test D — Mobile layout

In Firefox:

1. Press `Ctrl + Shift + M`.
2. Set width to `360` and height to `800`.
3. Refresh.
4. Open the mobile menu.
5. Scroll and open the coach profile.

Expected:

- No horizontal scrollbar.
- Text does not overlap.
- Buttons remain readable and clickable.
- The menu opens and closes.
- Profile details fit the screen.

Press `Ctrl + Shift + M` again to leave mobile mode.

## Test E — Keyboard use

1. Refresh the page.
2. Use only the Tab key and Enter/Space.
3. Move through navigation, search, sport filters, and profile buttons.

Expected:

- The selected control has a clear outline.
- Important actions can be reached.
- Profile can be closed with Escape.

## What to report

Choose one:

- `Calm Athletic`
- `Energetic Marketplace`
- `Hybrid: Calm structure with energetic search/buttons`
- Specific changes to either option

If something is broken, send:

1. Option name
2. Test letter
3. Step number
4. Screenshot
5. What happened instead of the expected result

## Reset

These are disposable previews. Refreshing the browser returns them to the initial state. They do not change files or save personal information.
