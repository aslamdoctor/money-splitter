import { useState, useEffect } from 'react'

function App() {
  // State for the list of bills/events
  const [bills, setBills] = useState([])
  // State for the current bill being created/edited
  const [currentBill, setCurrentBill] = useState({
    id: '',
    name: '',
    amount: '',
    paidBy: '',
    participants: [], // Now stores objects with {name, amount}
    splitMode: 'equal' // 'equal' or 'individual'
  })
  // State for the participant being added
  const [participant, setParticipant] = useState('')
  const [participantAmount, setParticipantAmount] = useState('')
  // State to control which view is active
  const [activeView, setActiveView] = useState('list') // 'list', 'create', 'detail'
  // State for the selected bill to view details
  const [selectedBill, setSelectedBill] = useState(null)

  // Load bills from localStorage on component mount
  useEffect(() => {
    const savedBills = localStorage.getItem('bills')
    if (savedBills) {
      setBills(JSON.parse(savedBills))
    }
  }, [])

  // Save bills to localStorage whenever bills state changes
  useEffect(() => {
    localStorage.setItem('bills', JSON.stringify(bills))
  }, [bills])

  // Handle input changes for the current bill
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCurrentBill({
      ...currentBill,
      [name]: value
    })
  }

  // Handle adding a participant
  const handleAddParticipant = () => {
    if (participant.trim() !== '') {
      const newParticipant = {
        name: participant.trim(),
        amount: currentBill.splitMode === 'individual' ? parseFloat(participantAmount) || 0 : 0
      }
      setCurrentBill({
        ...currentBill,
        participants: [...currentBill.participants, newParticipant]
      })
      setParticipant('')
      setParticipantAmount('')
    }
  }

  // Handle updating participant amount
  const handleUpdateParticipantAmount = (index, amount) => {
    const updatedParticipants = [...currentBill.participants]
    updatedParticipants[index].amount = parseFloat(amount) || 0
    setCurrentBill({
      ...currentBill,
      participants: updatedParticipants
    })
  }

  // Handle split mode change
  const handleSplitModeChange = (mode) => {
    setCurrentBill({
      ...currentBill,
      splitMode: mode,
      participants: currentBill.participants.map(p => ({
        ...p,
        amount: mode === 'equal' ? 0 : p.amount
      }))
    })
  }
  const handleRemoveParticipant = (index) => {
    const updatedParticipants = [...currentBill.participants]
    updatedParticipants.splice(index, 1)
    setCurrentBill({
      ...currentBill,
      participants: updatedParticipants
    })
  }

  // Handle saving a new bill
  const handleSaveBill = () => {
    if (currentBill.name && currentBill.participants.length > 0) {
      let totalAmount = 0
      
      if (currentBill.splitMode === 'equal' && currentBill.amount) {
        totalAmount = parseFloat(currentBill.amount)
      } else if (currentBill.splitMode === 'individual') {
        totalAmount = currentBill.participants.reduce((sum, p) => sum + (p.amount || 0), 0)
      }

      if (totalAmount > 0) {
        const newBill = {
          ...currentBill,
          id: Date.now().toString(),
          amount: totalAmount
        }
        setBills([...bills, newBill])
        setCurrentBill({
          id: '',
          name: '',
          amount: '',
          paidBy: '',
          participants: [],
          splitMode: 'equal'
        })
        setActiveView('list')
      }
    }
  }

  // Calculate how much each person owes
  const calculateSplits = (bill) => {
    if (bill.splitMode === 'individual') {
      // For individual amounts, calculate settlements to equalize
      const individualAmounts = bill.participants.map(p => ({
        name: p.name,
        amount: p.amount || 0
      }))
      
      const totalAmount = bill.amount
      const equalShare = totalAmount / bill.participants.length
      
      // Calculate how much each person is over/under their equal share
      const balances = individualAmounts.map(p => ({
        name: p.name,
        paidAmount: p.amount,
        shouldPay: equalShare,
        balance: p.amount - equalShare // positive means they paid extra, negative means they owe
      }))
      
      // Create settlements - people who paid extra get money, people who paid less give money
      const settlements = []
      const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance)
      const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance)
      
      let creditorIndex = 0
      let debtorIndex = 0
      
      while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
        const creditor = creditors[creditorIndex]
        const debtor = debtors[debtorIndex]
        
        const settlementAmount = Math.min(creditor.balance, Math.abs(debtor.balance))
        
        if (settlementAmount > 0.01) { // Only show settlements > 1 cent
          settlements.push({
            from: debtor.name,
            to: creditor.name,
            amount: settlementAmount
          })
        }
        
        creditor.balance -= settlementAmount
        debtor.balance += settlementAmount
        
        if (Math.abs(creditor.balance) < 0.01) creditorIndex++
        if (Math.abs(debtor.balance) < 0.01) debtorIndex++
      }
      
      return {
        individualAmounts,
        totalAmount,
        equalShare,
        balances,
        settlements
      }
    }

    // Equal split logic (existing)
    const amountPerPerson = bill.amount / bill.participants.length
    const splits = []

    if (bill.paidBy && bill.participants.some(p => p.name === bill.paidBy)) {
      // If paidBy is specified and is a participant
      bill.participants.forEach(person => {
        const personName = typeof person === 'string' ? person : person.name
        if (personName !== bill.paidBy) {
          splits.push({
            from: personName,
            to: bill.paidBy,
            amount: amountPerPerson
          })
        }
      })
    } else {
      // If no paidBy specified or paidBy is not a participant, just show the split amount
      return { amountPerPerson }
    }

    return { splits, amountPerPerson }
  }

  // View a bill's details
  const viewBillDetails = (bill) => {
    setSelectedBill(bill)
    setActiveView('detail')
  }

  // Delete a bill
  const handleDeleteBill = (id) => {
    setBills(bills.filter(bill => bill.id !== id))
    if (activeView === 'detail') {
      setActiveView('list')
    }
  }

  return (
    <div className="min-h-screen bg-blue-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 bg-blue-500 text-white">
          <h1 className="text-2xl font-bold text-center">Money Splitter</h1>
        </div>

        {/* Navigation */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-2 px-4 ${activeView === 'list' ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-600'}`}
            onClick={() => setActiveView('list')}
          >
            My Bills
          </button>
          <button
            className={`flex-1 py-2 px-4 ${activeView === 'create' ? 'bg-blue-100 text-blue-600 font-medium' : 'text-gray-600'}`}
            onClick={() => {
              setCurrentBill({
                id: '',
                name: '',
                amount: '',
                paidBy: '',
                participants: [],
                splitMode: 'equal'
              })
              setActiveView('create')
            }}
          >
            Create New
          </button>
        </div>

        {/* Bill List View */}
        {activeView === 'list' && (
          <div className="p-4">
            {bills.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No bills yet. Create your first bill!</p>
                <button
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg"
                  onClick={() => setActiveView('create')}
                >
                  Create New Bill
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {bills.map(bill => (
                  <li key={bill.id} className="py-3">
                    <div className="flex justify-between items-center">
                      <div onClick={() => viewBillDetails(bill)} className="cursor-pointer">
                        <h3 className="font-medium text-gray-800">{bill.name}</h3>
                        <p className="text-sm text-gray-500">
                          {bill.participants.length} participants · ${bill.amount.toFixed(2)}
                          {bill.splitMode === 'individual' && <span className="ml-1 text-blue-600">(Individual amounts)</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBill(bill.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Create Bill View */}
        {activeView === 'create' && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Name</label>
                <input
                  type="text"
                  name="name"
                  value={currentBill.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  placeholder="Dinner, Trip, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                <input
                  type="number"
                  name="amount"
                  value={currentBill.amount}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={currentBill.splitMode === 'individual'}
                />
                {currentBill.splitMode === 'individual' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Total will be calculated from individual amounts
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Split Mode</label>
                <div className="mt-2 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="splitMode"
                      value="equal"
                      checked={currentBill.splitMode === 'equal'}
                      onChange={(e) => handleSplitModeChange(e.target.value)}
                      className="form-radio text-blue-600"
                    />
                    <span className="ml-2">Equal Split</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="splitMode"
                      value="individual"
                      checked={currentBill.splitMode === 'individual'}
                      onChange={(e) => handleSplitModeChange(e.target.value)}
                      className="form-radio text-blue-600"
                    />
                    <span className="ml-2">Individual Amounts</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Paid By (Optional)</label>
                <input
                  type="text"
                  name="paidBy"
                  value={currentBill.paidBy}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  placeholder="Name of person who paid"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Add Participants</label>
                <div className="mt-1 space-y-2">
                  <div className="flex">
                    <input
                      type="text"
                      value={participant}
                      onChange={(e) => setParticipant(e.target.value)}
                      className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                      placeholder="Participant name"
                    />
                    {currentBill.splitMode === 'individual' && (
                      <input
                        type="number"
                        value={participantAmount}
                        onChange={(e) => setParticipantAmount(e.target.value)}
                        className="block w-24 border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        placeholder="Amount"
                        min="0"
                        step="0.01"
                      />
                    )}
                    <button
                      onClick={handleAddParticipant}
                      disabled={!participant.trim() || (currentBill.splitMode === 'individual' && !participantAmount)}
                      className="bg-blue-500 text-white px-4 rounded-r-md hover:bg-blue-600 disabled:bg-gray-300"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {currentBill.participants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participants
                    {currentBill.splitMode === 'individual' && (
                      <span className="ml-2 text-sm text-gray-500">
                        (Total: ${currentBill.participants.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)})
                      </span>
                    )}
                  </label>
                  <ul className="bg-gray-50 rounded-md p-2 space-y-2">
                    {currentBill.participants.map((p, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 flex-1">
                          <span>{p.name}</span>
                          {currentBill.splitMode === 'individual' && (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                value={p.amount || ''}
                                onChange={(e) => handleUpdateParticipantAmount(index, e.target.value)}
                                className="w-20 px-2 py-1 text-sm border rounded"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveParticipant(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>

                  {/* Settlement Preview for Individual Mode */}
                  {currentBill.splitMode === 'individual' && currentBill.participants.length > 1 && 
                   currentBill.participants.some(p => (p.amount || 0) > 0) && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-md">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Settlement Preview:</h4>
                      {(() => {
                        const totalAmount = currentBill.participants.reduce((sum, p) => sum + (p.amount || 0), 0)
                        if (totalAmount === 0) return null
                        
                        const equalShare = totalAmount / currentBill.participants.length
                        const tempBill = { ...currentBill, amount: totalAmount }
                        const result = calculateSplits(tempBill)
                        
                        return (
                          <div>
                            <div className="text-xs text-gray-600 mb-2">
                              Equal share: ${equalShare.toFixed(2)} per person
                            </div>
                            {result.settlements && result.settlements.length > 0 ? (
                              <ul className="space-y-1">
                                {result.settlements.map((settlement, index) => (
                                  <li key={index} className="text-xs">
                                    <span className="font-medium text-red-600">{settlement.from}</span> → <span className="font-medium text-green-600">{settlement.to}</span>: <span className="font-bold">${settlement.amount.toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-xs text-green-600">✓ Everyone pays equal share!</div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleSaveBill}
                  disabled={
                    !currentBill.name || 
                    currentBill.participants.length === 0 ||
                    (currentBill.splitMode === 'equal' && !currentBill.amount) ||
                    (currentBill.splitMode === 'individual' && currentBill.participants.reduce((sum, p) => sum + (p.amount || 0), 0) === 0)
                  }
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Save Bill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bill Detail View */}
        {activeView === 'detail' && selectedBill && (
          <div className="p-4">
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedBill.name}</h2>
                <p className="text-gray-500">Total: ${selectedBill.amount.toFixed(2)}</p>
                {selectedBill.splitMode && (
                  <p className="text-gray-500">
                    Split mode: {selectedBill.splitMode === 'equal' ? 'Equal Split' : 'Individual Amounts'}
                  </p>
                )}
                {selectedBill.paidBy && (
                  <p className="text-gray-500">Paid by: {selectedBill.paidBy}</p>
                )}
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Participants</h3>
                <ul className="bg-gray-50 rounded-md p-2 mt-2">
                  {selectedBill.participants.map((p, index) => {
                    const participantName = typeof p === 'string' ? p : p.name
                    const participantAmount = typeof p === 'object' && p.amount !== undefined ? p.amount : null
                    
                    return (
                      <li key={index} className="py-1 flex justify-between items-center">
                        <span>{participantName}</span>
                        {participantAmount !== null && selectedBill.splitMode === 'individual' && (
                          <span className="text-blue-600 font-medium">${participantAmount.toFixed(2)}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Split Details</h3>
                <div className="bg-gray-50 rounded-md p-3 mt-2">
                  {(() => {
                    const result = calculateSplits(selectedBill)

                    if (result.individualAmounts) {
                      // Individual amounts mode
                      return (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Individual amounts paid:</p>
                          <ul className="space-y-1 mb-3">
                            {result.individualAmounts.map((item, index) => (
                              <li key={index} className="text-sm flex justify-between">
                                <span className="font-medium">{item.name}</span>
                                <span>${item.amount.toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                          
                          <div className="border-t pt-2 mb-3">
                            <div className="text-sm flex justify-between mb-1">
                              <span>Total paid:</span>
                              <span className="font-medium">${result.totalAmount.toFixed(2)}</span>
                            </div>
                            <div className="text-sm flex justify-between">
                              <span>Equal share per person:</span>
                              <span className="font-medium">${result.equalShare.toFixed(2)}</span>
                            </div>
                          </div>

                          {result.settlements && result.settlements.length > 0 && (
                            <div className="border-t pt-3">
                              <p className="text-sm text-gray-600 mb-2 font-medium">Settlements to equalize:</p>
                              <ul className="space-y-1">
                                {result.settlements.map((settlement, index) => (
                                  <li key={index} className="text-sm bg-yellow-50 p-2 rounded">
                                    <span className="font-medium text-red-600">{settlement.from}</span> pays <span className="font-medium text-green-600">{settlement.to}</span> <span className="font-bold">${settlement.amount.toFixed(2)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(!result.settlements || result.settlements.length === 0) && (
                            <div className="border-t pt-3">
                              <p className="text-sm text-green-600 font-medium">✓ Everyone paid their equal share!</p>
                            </div>
                          )}
                        </div>
                      )
                    } else {
                      // Equal split mode (existing logic)
                      const amountPerPerson = result.amountPerPerson

                      return (
                        <div>
                          <p className="text-sm text-gray-600 mb-2">
                            Amount per person: ${amountPerPerson.toFixed(2)}
                          </p>

                          {result.splits && result.splits.length > 0 ? (
                            <ul className="space-y-1">
                              {result.splits.map((split, index) => (
                                <li key={index} className="text-sm">
                                  <span className="font-medium">{split.from}</span> owes <span className="font-medium">{split.to}</span> ${split.amount.toFixed(2)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-500 italic">
                              {selectedBill.paidBy ?
                                "The person who paid is not in the participants list." :
                                "No payer specified. Each person should pay their share."}
                            </p>
                          )}
                        </div>
                      )
                    }
                  })()}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleDeleteBill(selectedBill.id)}
                  className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
                >
                  Delete Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
