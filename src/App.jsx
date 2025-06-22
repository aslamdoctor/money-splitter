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
    participants: []
  })
  // State for the participant being added
  const [participant, setParticipant] = useState('')
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
      setCurrentBill({
        ...currentBill,
        participants: [...currentBill.participants, participant.trim()]
      })
      setParticipant('')
    }
  }

  // Handle removing a participant
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
    if (currentBill.name && currentBill.amount && currentBill.participants.length > 0) {
      const newBill = {
        ...currentBill,
        id: Date.now().toString(),
        amount: parseFloat(currentBill.amount)
      }
      setBills([...bills, newBill])
      setCurrentBill({
        id: '',
        name: '',
        amount: '',
        paidBy: '',
        participants: []
      })
      setActiveView('list')
    }
  }

  // Calculate how much each person owes
  const calculateSplits = (bill) => {
    const amountPerPerson = bill.amount / bill.participants.length
    const splits = []

    if (bill.paidBy && bill.participants.includes(bill.paidBy)) {
      // If paidBy is specified and is a participant
      bill.participants.forEach(person => {
        if (person !== bill.paidBy) {
          splits.push({
            from: person,
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
                participants: []
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
                />
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
                <div className="flex mt-1">
                  <input
                    type="text"
                    value={participant}
                    onChange={(e) => setParticipant(e.target.value)}
                    className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    placeholder="Participant name"
                  />
                  <button
                    onClick={handleAddParticipant}
                    className="bg-blue-500 text-white px-4 rounded-r-md hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>

              {currentBill.participants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Participants</label>
                  <ul className="bg-gray-50 rounded-md p-2 space-y-1">
                    {currentBill.participants.map((p, index) => (
                      <li key={index} className="flex justify-between items-center">
                        <span>{p}</span>
                        <button
                          onClick={() => handleRemoveParticipant(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleSaveBill}
                  disabled={!currentBill.name || !currentBill.amount || currentBill.participants.length === 0}
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
                {selectedBill.paidBy && (
                  <p className="text-gray-500">Paid by: {selectedBill.paidBy}</p>
                )}
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Participants</h3>
                <ul className="bg-gray-50 rounded-md p-2 mt-2">
                  {selectedBill.participants.map((p, index) => (
                    <li key={index} className="py-1">{p}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Split Details</h3>
                <div className="bg-gray-50 rounded-md p-3 mt-2">
                  {(() => {
                    const result = calculateSplits(selectedBill)
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
