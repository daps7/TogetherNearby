const MeetTogetherDB = (() => {
    const storageKey = 'meetTogetherDatabase';
    const legacyEventsKey = 'meetTogetherEvents';
    const currentUserId = 'user-demo';

    const seedData = {
        currentUserId,
        users: [
            { id: currentUserId, name: 'Demo User', email: 'demo@togethernearby.local' },
            { id: 'user-community', name: 'Together Nearby', email: 'community@togethernearby.local' },
            { id: 'user-friend-1', name: 'Alex Morgan', email: 'alex@example.local' },
            { id: 'user-sarah', name: 'Sarah Williams', email: 'sarah@example.local' },
            { id: 'user-james', name: 'James Patel', email: 'james@example.local' }
        ],
        events: [
            {
                id: 'event-coffee',
                creatorId: 'user-community',
                title: 'Coffee Morning',
                description: 'Enjoy coffee and conversation with friendly local people.',
                location: '📍 Community Café',
                date: '🕙 Tuesday 10:00 AM',
                emoji: '☕'
            },
            {
                id: 'event-walk',
                creatorId: 'user-community',
                title: 'Morning Walk',
                description: 'Walk around the park together.',
                location: '📍 Riverside Park',
                date: '🕙 Monday 9:00 AM',
                emoji: '🚶'
            },
            {
                id: 'event-chess',
                creatorId: 'user-community',
                title: 'Chess Club',
                description: 'Friendly games for beginners and experts.',
                location: '📍 Library',
                date: '🕙 Wednesday 2:00 PM',
                emoji: '♟️'
            },
            {
                id: 'event-museum',
                creatorId: 'user-community',
                title: 'Museum Visit',
                description: 'Explore local history together.',
                location: '📍 City Museum',
                date: '🕙 Friday 1:00 PM',
                emoji: '🏛️'
            },
            {
                id: 'event-football',
                creatorId: 'user-sarah',
                title: 'Friendly Football',
                description: 'A relaxed football game for all abilities.',
                location: '📍 Green Park',
                date: '🕙 Saturday 11:00 AM',
                emoji: '⚽'
            },
            {
                id: 'event-tennis',
                creatorId: 'user-james',
                title: 'Tennis for Beginners',
                description: 'Learn the basics and enjoy a friendly game.',
                location: '📍 Riverside Courts',
                date: '🕙 Sunday 2:00 PM',
                emoji: '🎾'
            }
        ],
        interests: [],
        friendships: [
            { id: 'friendship-demo-alex', userId: currentUserId, friendId: 'user-friend-1', status: 'accepted' }
        ]
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function read() {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey));
            if (stored && Array.isArray(stored.users) && Array.isArray(stored.events)) {
                stored.currentUserId = stored.currentUserId || currentUserId;
                stored.interests = Array.isArray(stored.interests) ? stored.interests : [];
                stored.friendships = Array.isArray(stored.friendships) ? stored.friendships : [];
                seedData.users.forEach(user => {
                    if (!stored.users.some(existing => existing.id === user.id)) stored.users.push(clone(user));
                });
                seedData.events.forEach(event => {
                    if (!stored.events.some(existing => existing.id === event.id)) stored.events.push(clone(event));
                });
                write(stored);
                return stored;
            }
        } catch (error) {
            console.error('Could not read the fake database', error);
        }

        const initialData = clone(seedData);
        migrateLegacyEvents(initialData);
        write(initialData);
        return initialData;
    }

    function write(data) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Could not write to the fake database', error);
        }
    }

    function migrateLegacyEvents(data) {
        try {
            const legacyEvents = JSON.parse(localStorage.getItem(legacyEventsKey) || '[]');
            if (Array.isArray(legacyEvents)) {
                legacyEvents.forEach(event => data.events.push({
                    ...event,
                    id: event.id || createId('event'),
                    creatorId: event.creatorId || currentUserId
                }));
            }
            localStorage.removeItem(legacyEventsKey);
        } catch (error) {
            console.error('Could not migrate saved events', error);
        }
    }

    function createId(prefix) {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function getCurrentUser() {
        const data = read();
        return clone(data.users.find(user => user.id === data.currentUserId));
    }

    function getUsers() {
        return clone(read().users);
    }

    function getUser(userId) {
        return clone(read().users.find(user => user.id === userId));
    }

    function login(name, email) {
        const data = read();
        const normalizedEmail = email.trim().toLowerCase();
        let user = data.users.find(item => item.email.toLowerCase() === normalizedEmail);

        if (!user) {
            user = { id: createId('user'), name: name.trim() || 'New User', email: normalizedEmail };
            data.users.push(user);
        } else if (name.trim()) {
            user.name = name.trim();
        }

        data.currentUserId = user.id;
        write(data);
        return clone(user);
    }

    function updateProfile(profileDetails) {
        const data = read();
        const user = data.users.find(item => item.id === data.currentUserId);
        if (user) {
            user.name = profileDetails.name.trim() || user.name;
            user.email = profileDetails.email.trim().toLowerCase() || user.email;
            write(data);
        }
        return clone(user);
    }

    function getEvents() {
        return clone(read().events);
    }

    function createEvent(eventDetails) {
        const data = read();
        const event = {
            id: createId('event'),
            creatorId: data.currentUserId,
            title: eventDetails.title || 'Untitled Event',
            description: eventDetails.description || '',
            location: eventDetails.location || '',
            date: eventDetails.date || '',
            emoji: eventDetails.emoji || '📌'
        };
        data.events.unshift(event);
        write(data);
        return clone(event);
    }

    function setInterest(eventId, interested = true) {
        const data = read();
        const existingIndex = data.interests.findIndex(interest =>
            interest.userId === data.currentUserId && interest.eventId === eventId
        );

        if (interested && existingIndex === -1) {
            data.interests.push({
                id: createId('interest'),
                userId: data.currentUserId,
                eventId
            });
        } else if (!interested && existingIndex !== -1) {
            data.interests.splice(existingIndex, 1);
        }

        write(data);
    }

    function getInterestedEvents(userId = read().currentUserId) {
        const data = read();
        const eventIds = data.interests
            .filter(interest => interest.userId === userId)
            .map(interest => interest.eventId);
        return clone(data.events.filter(event => eventIds.includes(event.id)));
    }

    function addFriend(friendId) {
        const data = read();
        const alreadyFriends = data.friendships.some(friendship =>
            friendship.userId === data.currentUserId && friendship.friendId === friendId
        );
        if (!alreadyFriends && friendId !== data.currentUserId) {
            data.friendships.push({
                id: createId('friendship'),
                userId: data.currentUserId,
                friendId,
                status: 'accepted'
            });
            write(data);
        }
    }

    function getFriends(userId = read().currentUserId) {
        const data = read();
        const friendIds = data.friendships
            .filter(friendship => friendship.userId === userId && friendship.status === 'accepted')
            .map(friendship => friendship.friendId);
        return clone(data.users.filter(user => friendIds.includes(user.id)));
    }

    function getCreatedEvents(userId = read().currentUserId) {
        return clone(read().events.filter(event => event.creatorId === userId));
    }

    return {
        getCurrentUser,
        getUsers,
        getUser,
        login,
        updateProfile,
        getEvents,
        createEvent,
        setInterest,
        getInterestedEvents,
        addFriend,
        getFriends,
        getCreatedEvents
    };
})();
