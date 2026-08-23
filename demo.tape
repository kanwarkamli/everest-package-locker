# VHS tape (https://github.com/charmbracelet/vhs) — regenerate with: vhs demo.tape
# Uses LOCKER_DEMO=1 so pickup codes are deterministic (000001, 000002, ...).

Output demo.gif

Set FontSize 15
Set Width 940
Set Height 640
Set Padding 12
Set TypingSpeed 40ms
Set Theme "Catppuccin Mocha"
Set Shell bash

Hide
Type `export PATH="$HOME/.nvm/versions/node/v22.21.1/bin:$PATH" LOCKER_DEMO=1 && clear`
Enter
Show

Type "npm start"
Enter
Sleep 3s

Type "create-locker small"
Enter
Sleep 1s
Type "create-locker medium"
Enter
Sleep 1s
Type "create-locker large"
Enter
Sleep 1s

Type "list-lockers"
Enter
Sleep 1.5s

Type "store small a book"
Enter
Sleep 2s

Type "store medium running shoes"
Enter
Sleep 1.5s

# Smallest-fit fallback: the medium locker is taken, so this lands in LARGE
Type "store medium headphones"
Enter
Sleep 2s

# No locker can hold a large package any more
Type "store large"
Enter
Sleep 2s

# Wrong pickup code is rejected, package stays put
Type "retrieve L1 999999"
Enter
Sleep 2s

Type "retrieve L1 000001"
Enter
Sleep 2.5s

Type "list-lockers"
Enter
Sleep 2s

Type "exit"
Enter
Sleep 1.5s
