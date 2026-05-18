import { db } from "./firebase";
import { collection, addDoc, getDocs, query, limit, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { menuItems } from "../data/menu";

export async function seedMenu(force = false) {
  try {
    const menuColl = collection(db, "menu");
    
    // Si on force, on supprime tout avant
    if (force) {
      console.log("Force mode: Clearing menu collection...");
      const allDocs = await getDocs(menuColl);
      const batch = writeBatch(db);
      allDocs.forEach((d) => {
        batch.delete(doc(db, "menu", d.id));
      });
      await batch.commit();
      console.log("Collection cleared.");
    } else {
      // Sinon on vérifie si c'est vide
      const q = query(menuColl, limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        console.log("Menu collection already has data. Skipping seed.");
        return false;
      }
    }

    console.log("Seeding menu starting...");
    let count = 0;
    
    const getInitialPreferences = (item: any) => {
      const prefs = [];
      const vegetarianIds = [
        "frites-patates-douces", "banane-bouillie", "riz", "attieke", "beignets", "frites", "manioc",
        "pancakes", "tiramisu", "degue", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine",
        "boisson-detox", "bissap", "jus-orange-presse", "eau", "jus-gingembre", "feuilles-manioc"
      ];
      if (vegetarianIds.includes(item.id)) prefs.push("veg");
      
      const spicyIds = ["pastels", "odika-poulet", "jus-gingembre"];
      if (spicyIds.includes(item.id)) prefs.push("spicy");
      
      // Default fallback is halal for all Afro Miaam dishes
      prefs.push("halal");
      
      if (!item.id.includes("mafe")) prefs.push("nutfree");
      
      const containGluten = ["samoussa-boeuf", "pastels", "samoussa-thon", "pancakes", "crepes", "fondant-chocolat", "gateau-banane", "gateau-farine"];
      if (!containGluten.includes(item.id)) prefs.push("glutenfree");
      
      return prefs;
    };

    for (const item of menuItems) {
      await addDoc(collection(db, "menu"), {
        name: item.name || "Sans nom",
        description: item.description || "",
        price: Number(item.price) || 0,
        image: item.image || "/img/placeholder.jpg",
        category: item.category || "plat",
        tags: item.tags || [],
        available: true,
        preferences: getInitialPreferences(item),
        createdAt: serverTimestamp(),
      });
      count++;
    }
    
    console.log(`Menu seeded successfully with ${count} items!`);
    return true;
  } catch (error) {
    console.error("Critical error during seedMenu:", error);
    throw error;
  }
}
