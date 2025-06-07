import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api'; // Assuming api util for authenticated calls
import { FaWallet } from 'react-icons/fa'; // Example icon

// Simple event emitter for balance updates (can be replaced by context)
export const balanceEventEmitter = {
    listeners: [],
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    },
    emit() {
        this.listeners.forEach(listener => listener());
    }
};

const UserBalanceDisplay = ({ className }) => {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchBalance = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/balance');
            setBalance(parseFloat(response.data.balance).toFixed(2));
            setError('');
        } catch (err) {
            setError('Failed to load balance.');
            console.error("Error fetching balance:", err);
            setBalance(null); // Clear balance on error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBalance();
        const unsubscribe = balanceEventEmitter.subscribe(fetchBalance);
        return unsubscribe; // Cleanup subscription
    }, [fetchBalance]);

    if (loading) {
        return <span className={`text-sm ${className || ''}`}>Loading balance...</span>;
    }
    if (error) {
        // Optionally, provide a retry button
        return <span className={`text-sm text-red-500 ${className || ''}`}>{error} <button onClick={fetchBalance} className="ml-1 underline">Retry</button></span>;
    }

    return (
        <div className={`flex items-center text-sm ${className || ''}`}>
            <FaWallet className="mr-1 text-yellow-500" />
            <span>Balance:</span>
            <span className="font-semibold ml-1">${balance !== null ? balance : 'N/A'}</span>
        </div>
    );
};
export default UserBalanceDisplay;
