# 💳 Team Expenditure Dashboard

A modern, responsive dashboard for tracking team card details and transaction history. Built for integration with Zoho Cliq databases.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Zoho%20Cliq-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

- **💳 Card Management**: View all team cards with masked card numbers for security
- **💰 Transaction Tracking**: Monitor all transactions with real-time status updates
- **📊 Financial Summary**: Get insights on spending by bank and merchant
- **👥 User Analytics**: Track individual user spending and card usage
- **🎨 Modern UI**: Clean, responsive design with intuitive tab navigation
- **🔒 Security**: Masked card numbers showing only last 4 digits

## 📋 Dashboard Tabs

### 1. Cards Tab
Displays all company cards with:
- Masked card numbers (****-****-****-1234)
- Card ID and User details
- Bank information
- Active/Inactive status indicators
- Remarks and notes

### 2. Transactions Tab
Real-time transaction monitoring:
- Date and time stamps
- Merchant information
- Transaction amounts (₹)
- Card used (masked)
- Success/Failure status (✅/❌)
- Transaction IDs

### 3. Summary Tab
Financial overview including:
- Total cards count
- Total transactions
- Total amount spent
- Spending breakdown by merchant
- Cards grouped by bank

### 4. User Spending Tab
Per-user analytics:
- Individual user spending totals
- Card-wise transaction breakdown
- Transaction counts per card
- Bank associations

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Zoho Cliq Deluge Scripts
- **Database**: Zoho Cliq Databases (cardsdb, transactionsdb)
- **Hosting**: GitHub Pages
- **API**: Zoho Cliq REST API

## 📦 Database Schema

### Cards Database (`cardsdb`)
| Field | Type | Description |
|-------|------|-------------|
| `cardnum` | Text/Number | Card number |
| `status` | Boolean | Active/Inactive status |
| `userid` | Text | User ID |
| `bank` | Text | Issuing bank name |
| `name` | Text | Cardholder name |
| `cardid` | Text | Unique card identifier |
| `remarks` | Text | Additional notes (optional) |

### Transactions Database (`transactionsdb`)
| Field | Type | Description |
|-------|------|-------------|
| `cardnum` | Text/Number | Card number (links to cardsdb) |
| `status` | Boolean | Transaction success status |
| `transactionid` | Text | Unique transaction ID |
| `merchant` | Text | Merchant/vendor name |
| `datetime` | DateTime | Transaction timestamp |
| `amount` | Number | Transaction amount in ₹ |



