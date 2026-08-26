# Running Apps Quick Toggle

A small GNOME Shell extension that shows running AppIndicator / StatusNotifier apps inside Quick Settings. Inspired by Background Apps.

This is still pretty experimental and mostly something I built for myself.

_Disclaimer: I have no with experience gtk / gnome-shell code.. so AI was/is heavily used_

<img width="389" height="530" alt="image" src="https://github.com/user-attachments/assets/e2f29c03-734b-4bbe-ba41-fe63dc93e947" />

## Goals

- [x] Tries to behave like the normal AppIndicator tray, just inside Quick Settings
  - [x] App Icon and menu
  - [x] Submenu
  - [x] Scrollable on overflow (hardcoded to 600px atm) 
- [ ] Add Exceptions to show it on systray 
## Credits

A lot of the implementation is based on the AppIndicator/KStatusNotifier extensions.

### Alternative methods I tried and abandoned

- Git submoduling AppIndicator/KStatusNotifier and adding an adapter but the code was way too coupled and I was pratically initialising their extension.
- Copying Background Apps Implementation but that were gnome internals that have no guarantee and extension risk breakage with every update even without entangling myself in internal APIs.
