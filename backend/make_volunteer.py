# Conturile de voluntar nu se creează din site (oricine ar putea deveni voluntar), ci de echipă, cu acest script.
# Rulează din folderul backend:
#
#   python make_volunteer.py email@exemplu.ro "Numele" parola-de-minim-8-caractere   -> creează un cont nou de voluntar
#   python make_volunteer.py email@exemplu.ro                                          -> transformă un cont existent în voluntar
#   python make_volunteer.py email@exemplu.ro user                                     -> îl readuce la utilizator obișnuit
#
# Voluntarii intră în site din „Login voluntari" (un cont de voluntar nu poate intra din „Login" pentru utilizatori).
import sys

from auth import ROLES, register_user, set_role

args = sys.argv[1:]
if not args:
    sys.exit(__doc__)

email = args[0]
if len(args) >= 3:
    try:
        register_user(email, args[1], args[2])
    except ValueError as error:
        sys.exit(f"Contul nu a putut fi creat: {error}")
    set_role(email, "volunteer")
    print(f"Gata: contul de voluntar {email} a fost creat. Poate intra din „Login voluntari”.")
else:
    role = args[1] if len(args) == 2 else "volunteer"
    if role not in ROLES:
        sys.exit("Rolul trebuie să fie 'volunteer' sau 'user'.")
    if set_role(email, role):
        print(f"Gata: {email} are acum rolul '{role}'. Dacă era logat(ă), trebuie să se delogheze și să intre din nou.")
    else:
        print(f"Nu există niciun cont cu emailul {email}. Ca să creezi unul nou, adaugă și numele și parola (vezi comentariul din fișier).")
