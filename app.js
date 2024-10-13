import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getFirestore, getDocs, collection, updateDoc, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCknKmT4tpIeL0xc2Ncmq3k8k8dg1zbhf4",
    authDomain: "businessman-acd57.firebaseapp.com",
    projectId: "businessman-acd57",
    storageBucket: "businessman-acd57.appspot.com",
    messagingSenderId: "570639803478",
    appId: "1:570639803478:web:d8d42e3e771bd5cea207f7",
    measurementId: "G-7K0W267Z0P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then((registration) => {
                console.log('Service Worker registrato con successo:', registration);
            })
            .catch((error) => {
                console.error('Registrazione del Service Worker fallita:', error);
            });
    });
}


let stock = {};
let selectedItems = {};
let saldoData = { uscite: 0, entrate: 0, totale: 0 };

// Function to load saldo from Firestore
// Function to load saldo from Firestore
async function loadSaldoFromFirestore() {
    const saldoDoc = await getDoc(doc(db, "oggetti", "saldo"));
    if (saldoDoc.exists()) {
        const saldo = saldoDoc.data();

        // Convertire le proprietà in numeri decimali
        saldoData.uscite = parseFloat(saldo.uscite) || 0;
        saldoData.entrate = parseFloat(saldo.entrate) || 0;
        saldoData.totale = parseFloat(saldo.totale) || 0;

        document.getElementById('uscite-value').innerText = `${saldoData.uscite.toFixed(2)} €`;
        document.getElementById('entrate-value').innerText = `${saldoData.entrate.toFixed(2)} €`;
        document.getElementById('balance-value').innerText = `${saldoData.totale.toFixed(2)} €`;
    } else {
        console.log("No such document!");
    }
}

// Function to update saldo in Firestore
async function updateSaldo(usciteChange = 0, entrateChange = 0) {
    saldoData.uscite += parseFloat(usciteChange) || 0;
    saldoData.entrate += parseFloat(entrateChange) || 0;
    saldoData.totale = saldoData.entrate - saldoData.uscite;

    // Update UI con numeri formattati correttamente
    document.getElementById('uscite-value').innerText = `${saldoData.uscite.toFixed(2)} €`;
    document.getElementById('entrate-value').innerText = `${saldoData.entrate.toFixed(2)} €`;
    document.getElementById('balance-value').innerText = `${saldoData.totale.toFixed(2)} €`;

    // Update Firestore document
    const saldoRef = doc(db, "oggetti", "saldo");
    await updateDoc(saldoRef, saldoData);
}


document.addEventListener("DOMContentLoaded", function() {
    const loginButton = document.getElementById('login-button');
    const passwordInput = document.getElementById('password');
    const loginContainer = document.getElementById('login-container');
    const mainContainer = document.getElementById('main-container');
    const loginError = document.getElementById('login-error');

    loginButton.addEventListener('click', () => {
        const password = passwordInput.value;
        if (password === 'gianlu' || password === 'giuse') {
            loginContainer.classList.add('hidden');
            mainContainer.classList.remove('hidden');
            loadItemsFromFirestore();
            loadStockFromFirestore();
            loadSaldoFromFirestore(); // Load saldo data
        } else {
            passwordInput.classList.add('error');
            loginError.classList.remove('hidden');
            shakeInput();
        }
    });

    async function loadItemsFromFirestore() {
        const querySnapshot = await getDocs(collection(db, "oggetti"));
        const itemList = document.getElementById("item-list");
        itemList.innerHTML = ""; 
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const itemId = doc.id;
    
            // Convertiamo prezzo in numero assicurandoci che sia valido
            let prezzo = parseFloat(data.prezzo);
            if (isNaN(prezzo)) {
                prezzo = 0;  // Valore predefinito se il prezzo non è valido
            }
    
            stock[itemId] = { 
                nome: data.nome, 
                prezzo: prezzo, 
                qty: 0, 
                stock: data.stock 
            };
    
            // Controlliamo che il nome esista e il prezzo sia un numero valido
            if (data.nome && !isNaN(prezzo)) {
                const itemDiv = document.createElement("div");
                itemDiv.classList.add("item");
    
                // Usiamo toFixed solo se prezzo è un numero
                itemDiv.innerHTML = `
                    <h3>${data.nome}</h3>
                    <p>Costo Singolo: ${prezzo.toFixed(2)} € | Quantità: <span id="${itemId}-qty">0</span></p>
                    <button class="qty-button green" onclick="increaseQty('${itemId}')">+</button>
                    <button class="qty-button red" onclick="decreaseQty('${itemId}')">-</button>
                    <hr>
                `;
                itemList.appendChild(itemDiv);
            }
        });
    }
    
    

    window.increaseQty = function(itemId) {
        stock[itemId].qty++;
        selectedItems[itemId] = stock[itemId];
        document.getElementById(`${itemId}-qty`).innerText = stock[itemId].qty;
        document.getElementById("confirm-button").classList.remove("hidden");
    }

    window.decreaseQty = function(itemId) {
        if (stock[itemId].qty > 0) {
            stock[itemId].qty--;
            selectedItems[itemId] = stock[itemId];
            document.getElementById(`${itemId}-qty`).innerText = stock[itemId].qty;
            if (stock[itemId].qty === 0) {
                delete selectedItems[itemId];
            }
        }
    }

    window.confirmPurchase = async function() {
        console.log("Acquisto confermato:", selectedItems);
    
        let totalPurchaseCost = 0;
    
        for (const itemId in selectedItems) {
            const item = selectedItems[itemId];
            const itemDoc = doc(db, "oggetti", itemId);
    
            // Fetch the current stock from the database
            const itemData = await getDoc(itemDoc);
            if (itemData.exists()) {
                const currentStock = itemData.data().stock;
    
                // Calculate the total cost for this item
                const itemTotalCost = item.prezzo * item.qty;
                totalPurchaseCost += itemTotalCost;
    
            // Check if there is enough stock available
                // Update the stock in the database by reducing it
                await updateDoc(itemDoc, {
                    stock: currentStock + item.qty // Update stock
                });

                // Update the UI element for quantity
                const qtyElement = document.getElementById(`${itemId}-qty`);
                if (qtyElement) {
                    qtyElement.innerText = 0; // Reset the displayed quantity
                }
            } else {
                alert("Articolo non trovato nel database.");
                return; // Stop processing if the item is not found
            }
        }
    
        // Update the balance with the total purchase cost
        await updateSaldo(totalPurchaseCost, 0);
    
        // Reset selected items
        selectedItems = {};
        Object.keys(stock).forEach(itemId => {
            stock[itemId].qty = 0; // Reset quantities in stock object
            const qtyElement = document.getElementById(`${itemId}-qty`);
            if (qtyElement) {
                qtyElement.innerText = 0; // Reset UI element for quantities
            }
        });
    
        const confirmButton = document.getElementById("confirm-button");
        if (confirmButton) {
            confirmButton.classList.add("hidden"); // Hide confirm button after purchase
        }
    
        alert("Acquisto confermato!"); // Show confirmation message
        loadStockFromFirestore(); // Reload stock from Firestore to update UI
    };
    
    
    

    async function loadStockFromFirestore() {
        const querySnapshot = await getDocs(collection(db, "oggetti"));
        const stockList = document.getElementById("stock-list");
        stockList.innerHTML = ""; // Clear existing content
    
        const sortedItems = querySnapshot.docs.sort((a, b) => a.data().nome.localeCompare(b.data().nome));
    
        sortedItems.forEach((doc) => {
            const data = doc.data();
    
            // Convert price to number ensuring it's valid
            let prezzo = parseFloat(data.prezzo);
            if (isNaN(prezzo)) {
                prezzo = 0; // Default value if price is invalid
            }
    
            // Check if both name and price exist
            if (data.nome && !isNaN(prezzo)) {
                const stockDiv = document.createElement("div");
                stockDiv.classList.add("stock-item");
    
                // Use toFixed only if price is a number and set a unique ID for the stock quantity
                stockDiv.innerHTML = `
                    <h3>${data.nome}</h3>
                    <p id="stock-${doc.id}">Prezzo: ${prezzo.toFixed(2)} € | Quantità Stock: ${data.stock}</p>
                    <button class="sell-button" onclick="showSellInput('${doc.id}', '${data.nome}')">Vendi</button>
                    <div id="sell-input-${doc.id}" class="hidden">
                        <input type="number" id="sell-price-${doc.id}" placeholder="Prezzo venduto" />
                        <button onclick="confirmSell('${doc.id}')">Conferma Vendita</button>
                    </div>
                    <hr>
                `;
    
                stockList.appendChild(stockDiv);
            }
        });
    }
    

    window.showSellInput = function(itemId, itemName) {
        const sellInput = document.getElementById(`sell-input-${itemId}`);
        sellInput.classList.remove("hidden");
    }

    window.confirmSell = async function(itemId) {
        const sellPriceInput = document.getElementById(`sell-price-${itemId}`).value; // Get the entered sell price
        const sellPrice = parseFloat(sellPriceInput); // Convert the sell price to a float
        if (isNaN(sellPrice)) { // Check if it's a valid number
            alert("Inserisci un prezzo di vendita valido."); // Alert if invalid
            return;
        }
    
        const itemDoc = doc(db, "oggetti", itemId); // Get the document reference for the item
        const itemData = await getDoc(itemDoc); // Fetch the item data
    
        if (itemData.exists()) { // Check if the item exists
            const itemStock = itemData.data().stock; // Get the current stock
            let itemPrezzo = itemData.data().prezzo; // Get the price from the document
    
            // Log the price for debugging
            console.log(`Prezzo originale: ${itemPrezzo}, Tipo: ${typeof itemPrezzo}`);
    
            // Ensure itemPrezzo is a number
            if (typeof itemPrezzo === 'string') {
                itemPrezzo = parseFloat(itemPrezzo); // Convert from string to number if necessary
            }
    
            // Check if itemPrezzo is still not a number
            if (isNaN(itemPrezzo)) {
                itemPrezzo = 0; // Default value if still not a valid number
            }
    
            // Check if there are units in stock before selling
            if (itemStock > 0) {
                // Update the document in Firestore to reduce stock by 1
                await updateDoc(itemDoc, {
                    stock: itemStock - 1
                });
    
                // Update the balance with the sell price
                await updateSaldo(0, sellPrice); 
    
                // Update the UI immediately
                const stockElement = document.querySelector(`#stock-${itemId}`);
                if (stockElement) {
                    stockElement.innerText = `Prezzo: ${itemPrezzo.toFixed(2)} € | Quantità Stock: ${itemStock - 1}`; // Update stock display
                }
    
                alert(`Hai venduto l'articolo per ${sellPrice} €`); // Confirmation message
            } else {
                alert("Stock insufficiente per la vendita."); // Alert if insufficient stock
            }
        } else {
            alert("Articolo non trovato."); // Alert if the item does not exist
        }
    };
    
       
});

// Navigation between sections
window.showSection = function(section) {
    document.querySelectorAll('.section').forEach((sec) => sec.classList.add('hidden'));
    document.getElementById(`${section}-section`).classList.remove('hidden');
}
