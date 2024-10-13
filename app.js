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
    
            totalPurchaseCost += item.prezzo * item.qty;
    
            await updateDoc(itemDoc, {
                stock: item.stock - item.qty
            });
    
            // Verifica che l'elemento per l'aggiornamento esista
            const qtyElement = document.getElementById(`${itemId}-qty`);
            if (qtyElement) {
                qtyElement.innerText = 0;
            }
        }
    
        await updateSaldo(totalPurchaseCost, 0);
    
        selectedItems = {};
        Object.keys(stock).forEach(itemId => {
            stock[itemId].qty = 0;
            const qtyElement = document.getElementById(`${itemId}-qty`);
            if (qtyElement) {
                qtyElement.innerText = 0;
            }
        });
    
        const confirmButton = document.getElementById("confirm-button");
        if (confirmButton) {
            confirmButton.classList.add("hidden");
        }
    
        alert("Acquisto confermato!");
        loadStockFromFirestore();
    }
    

    async function loadStockFromFirestore() {
        const querySnapshot = await getDocs(collection(db, "oggetti"));
        const stockList = document.getElementById("stock-list");
        stockList.innerHTML = ""; 
    
        const sortedItems = querySnapshot.docs.sort((a, b) => a.data().nome.localeCompare(b.data().nome));
    
        sortedItems.forEach((doc) => {
            const data = doc.data();
    
            // Convertiamo prezzo in numero assicurandoci che sia valido
            let prezzo = parseFloat(data.prezzo);
            if (isNaN(prezzo)) {
                prezzo = 0;  // Valore predefinito se il prezzo non è valido
            }
    
            // Verifica se esistono sia il nome che il prezzo
            if (data.nome && !isNaN(prezzo)) {
                const stockDiv = document.createElement("div");
                stockDiv.classList.add("stock-item");
    
                // Usiamo toFixed solo se prezzo è un numero
                stockDiv.innerHTML = `
                    <h3>${data.nome}</h3>
                    <p>Prezzo: ${prezzo.toFixed(2)} € | Quantità Stock: ${data.stock}</p>
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
        const sellPrice = document.getElementById(`sell-price-${itemId}`).value;
        if (sellPrice) {
            await updateSaldo(0, parseFloat(sellPrice));
            alert(`Hai venduto l'articolo per ${sellPrice} €`);
        } else {
            alert("Inserisci un prezzo di vendita valido.");
        }
    }
});

// Navigation between sections
window.showSection = function(section) {
    document.querySelectorAll('.section').forEach((sec) => sec.classList.add('hidden'));
    document.getElementById(`${section}-section`).classList.remove('hidden');
}
