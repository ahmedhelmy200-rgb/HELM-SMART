import React from 'react';

const RemindersPage = ({ reminders, onAddReminder, onRemoveReminder }) => {
    const handleAddReminder = () => {
        const reminderText = prompt('Enter reminder:');
        if (reminderText) {
            onAddReminder(reminderText);
        }
    };

    return (
        <div>
            <h1>Reminders</h1>
            <button onClick={handleAddReminder}>Add Reminder</button>
            <ul>
                {reminders.map((reminder, index) => (
                    <li key={index}>
                        {reminder} <button onClick={() => onRemoveReminder(index)}>Remove</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default RemindersPage;
