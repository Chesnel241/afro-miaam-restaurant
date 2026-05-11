import { db } from "./firebase";
import { collection, addDoc, getDocs, query, limit, serverTimestamp } from "firebase/firestore";
import { menuItems } from "../data/menu";

export async function seedMenu() {
  try {
    const q = query(collection(db, "menu"), limit(1));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      console.log("Seeding menu starting...");
      let count = 0;
      
      for (const item of menuItems) {
        await addDoc(collection(db, "menu"), {
          name: item.name || "Sans nom",
          description: item.description || "",
          price: item.price || 0,
          image: item.image || "/img/placeholder.jpg",
          category: item.category || "plat",
          tags: item.tags || [],
          available: true,
          createdAt: serverTimestamp(),
        });
        count++;
      }
      
      console.log(`Menu seeded successfully with ${count} items!`);
      return true;
    } else {
      console.log("Menu collection already has data. Skipping seed.");
      return false;
    }
  } catch (error) {
    console.error("Critical error during seedMenu:", error);
    throw error;
  }
}
