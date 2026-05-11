import { db } from "./firebase";
import { collection, addDoc, getDocs, query, limit } from "firebase/firestore";
import { menuItems } from "../data/menu";

export async function seedMenu() {
  const q = query(collection(db, "menu"), limit(1));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("Seeding menu...");
    for (const item of menuItems) {
      await addDoc(collection(db, "menu"), {
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category,
        tags: item.tags || [],
        available: true,
      });
    }
    console.log("Menu seeded !");
  }
}
