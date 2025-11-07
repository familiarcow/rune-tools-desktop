  My Committed CSS Development Protocol:

  1. Always use component-scoped selectors (.wallet-portfolio-*, .component-name-*)
  2. Test each change individually before proceeding
  3. Start with inline styles for testing, then move to scoped CSS
  4. Never modify global selectors (.btn, .card, etc.)
  5. Incremental changes only - one small change at a time
  6. If an element has something that refreshes and changes, apply a beautiful and clean animation for the transition.

  Network Sensitivity:
  - We have a "network" setting: mainnet or stagenet
  - If calling thornode, you must respect the network that is selected and use the proper endpoint & user address

  Transactions
  - Whenever we need the user to send a transaction, it will be either a MsgSend or a MsgDeposit
  - We have a SendTransaction modal that can perform both MsgSend and MsgDeposit
  - If a component wants to do a transaction, call the Send Modal with the proper data pre-filled (amount, memo, Msg Type, etc)


  Here are the key rules for calling SendTransaction from anywhere in the app:
  - Import SendTransaction, SendTransactionData, AssetBalance and create a private property sendTransaction: SendTransaction | null = null. Initialize it with new 
  SendTransaction(dialogContainer, this.services) where dialogContainer = document.getElementById('global-overlay-container')
  - Always pass amounts in normalized units (user-friendly values like "100" for 100 RUNE, not base units like "10000000000"). SendTransaction handles the conversion to
  base units internally when building blockchain transactions.
  - Use skipToConfirmation: true in prePopulatedData to skip directly to the confirmation page. Set transactionType: 'deposit' for MsgDeposit or 'send' for MsgSend.
   Pass the transaction details as: { asset: 'THOR.RUNE', amount: '100', memo: 'YOUR_MEMO' }
  - Create SendTransactionData with current network address (walletId, name, currentAddress based on network, network, availableBalances[]). Use the callback to
  handle post-transaction cleanup like refreshing data with appropriate delays.