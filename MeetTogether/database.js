const MeetTogetherDB = (() => {
    const storageKey = 'meetTogetherDatabase';
    const legacyEventsKey = 'meetTogetherEvents';
    const currentUserId = 'user-demo';

    const seedData = {
        currentUserId,
        users: [
            { id: currentUserId, name: 'Demo User', email: 'demo@togethernearby.local', phone: '', premium: false },
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
        chatRooms: [],
        directMessages: [],
        reviews: [],
        friendships: [
            { id: 'friendship-demo-alex', userId: currentUserId, friendId: 'user-friend-1', status: 'accepted' }
        ]
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function publicUser(user) {
        if (!user) return user;
        const safeUser = clone(user);
        delete safeUser.passwordHash;
        return safeUser;
    }

    function read() {
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey));
            if (stored && Array.isArray(stored.users) && Array.isArray(stored.events)) {
                stored.currentUserId = stored.currentUserId || currentUserId;
                stored.users.forEach(user => { user.phone = user.phone || ''; user.premium = user.premium === true; });
                stored.interests = Array.isArray(stored.interests) ? stored.interests : [];
                stored.chatRooms = Array.isArray(stored.chatRooms) ? stored.chatRooms : [];
                stored.directMessages = Array.isArray(stored.directMessages) ? stored.directMessages : [];
                stored.reviews = Array.isArray(stored.reviews) ? stored.reviews : [];
                stored.friendships = Array.isArray(stored.friendships) ? stored.friendships : [];
                seedData.users.forEach(user => {
                    if (!stored.users.some(existing => existing.id === user.id)) stored.users.push(clone(user));
                });
                seedData.events.forEach(event => {
                    if (!stored.events.some(existing => existing.id === event.id)) stored.events.push(clone(event));
                });
                stored.interests.forEach(interest => ensureChatRoom(stored, interest.eventId));
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
        return publicUser(data.users.find(user => user.id === data.currentUserId));
    }

    function isAuthenticated() {
        const data = read();
        return localStorage.getItem('meetTogetherAuthenticated') === 'true' || data.currentUserId !== currentUserId;
    }

    function logout() {
        const data = read();
        data.currentUserId = currentUserId;
        localStorage.removeItem('meetTogetherAuthenticated');
        write(data);
    }

    function getUsers() {
        return read().users.map(publicUser);
    }

    function getUser(userId) {
        return publicUser(read().users.find(user => user.id === userId));
    }

    async function hashPassword(password) {
        const encodedPassword = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encodedPassword);
        return Array.from(new Uint8Array(hashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async function login(name, email, password) {
        const data = read();
        const normalizedEmail = email.trim().toLowerCase();
        const user = data.users.find(item => item.email.toLowerCase() === normalizedEmail);
        if (!user) return { user: null, error: 'invalid' };
        const passwordHash = await hashPassword(password);

        if (user.passwordHash && user.passwordHash !== passwordHash) {
            return { user: null, error: 'invalid' };
        }
        if (!user.passwordHash) {
            user.passwordHash = passwordHash;
        }
        if (name.trim()) user.name = name.trim();

        data.currentUserId = user.id;
        localStorage.setItem('meetTogetherAuthenticated', 'true');
        write(data);
        return { user: publicUser(user), error: null };
    }

    async function register(name, email, phone, password) {
        const data = read();
        const normalizedEmail = email.trim().toLowerCase();
        if (data.users.some(user => user.email.toLowerCase() === normalizedEmail)) {
            return { user: null, error: 'exists' };
        }
        const user = {
            id: createId('user'),
            name: name.trim() || 'New User',
            email: normalizedEmail,
            phone: phone.trim(),
            passwordHash: await hashPassword(password),
            premium: false
        };
        data.users.push(user);
        data.currentUserId = user.id;
        localStorage.setItem('meetTogetherAuthenticated', 'true');
        write(data);
        return { user: publicUser(user), error: null };
    }

    async function updateProfile(profileDetails) {
        const data = read();
        const user = data.users.find(item => item.id === data.currentUserId);
        if (!user || !profileDetails.currentPassword) return { user: null, error: 'password-required' };
        const passwordHash = await hashPassword(profileDetails.currentPassword);
        if (!user.passwordHash || user.passwordHash !== passwordHash) return { user: null, error: 'invalid-password' };
        const normalizedEmail = profileDetails.email.trim().toLowerCase();
        const emailInUse = data.users.some(item => item.id !== user.id && item.email.toLowerCase() === normalizedEmail);
        if (emailInUse) return { user: null, error: 'email-in-use' };
        user.name = profileDetails.name.trim();
        user.email = normalizedEmail;
        user.phone = profileDetails.phone ? profileDetails.phone.trim() : user.phone || '';
        write(data);
        return { user: publicUser(user), error: null };
    }

    function setPremium(enabled) {
        const data = read();
        if (!isAuthenticated()) return null;
        const user = data.users.find(item => item.id === data.currentUserId);
        if (user) {
            user.premium = enabled === true;
            write(data);
        }
        return publicUser(user);
    }

    function getEvents() {
        return clone(read().events);
    }

    function createEvent(eventDetails) {
        const data = read();
        if (!isAuthenticated()) return null;
        const user = data.users.find(item => item.id === data.currentUserId);
        const createdEventCount = data.events.filter(event => event.creatorId === data.currentUserId).length;
        const eventLimit = user && user.premium ? 20 : 3;
        if (createdEventCount >= eventLimit) return null;
        const event = {
            id: createId('event'),
            creatorId: data.currentUserId,
            title: eventDetails.title || 'Untitled Event',
            description: eventDetails.description || '',
            location: eventDetails.location || '',
            date: eventDetails.date || '',
            dateValue: eventDetails.dateValue || '',
            timeValue: eventDetails.timeValue || '',
            emoji: eventDetails.emoji || '📌'
        };
        data.events.unshift(event);
        write(data);
        return clone(event);
    }

    function updateEvent(eventId, eventDetails) {
        const data = read();
        if (!isAuthenticated()) return null;
        const event = data.events.find(item => item.id === eventId && item.creatorId === data.currentUserId);
        if (!event) return null;
        event.title = eventDetails.title || event.title;
        event.description = eventDetails.description || '';
        event.location = eventDetails.location || '';
        event.date = eventDetails.date || event.date;
        event.dateValue = eventDetails.dateValue || event.dateValue || '';
        event.timeValue = eventDetails.timeValue || event.timeValue || '';
        event.emoji = eventDetails.emoji || '📌';
        const room = data.chatRooms.find(item => item.eventId === eventId);
        if (room) room.name = `${event.title} chat`;
        write(data);
        return clone(event);
    }

    function deleteEvent(eventId) {
        const data = read();
        if (!isAuthenticated()) return false;
        const eventIndex = data.events.findIndex(item => item.id === eventId && item.creatorId === data.currentUserId);
        if (eventIndex === -1) return false;
        data.events.splice(eventIndex, 1);
        data.interests = data.interests.filter(interest => interest.eventId !== eventId);
        data.chatRooms = data.chatRooms.filter(room => room.eventId !== eventId);
        write(data);
        return true;
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

        if (interested) ensureChatRoom(data, eventId);

        write(data);
    }

    function ensureChatRoom(data, eventId) {
        let room = data.chatRooms.find(item => item.eventId === eventId);
        if (!room) {
            const event = data.events.find(item => item.id === eventId);
            room = {
                id: createId('chat-room'),
                eventId,
                name: event ? `${event.title} chat` : 'Event chat',
                members: [],
                messages: []
            };
            data.chatRooms.push(room);
        }
        if (!room.members.includes(data.currentUserId)) room.members.push(data.currentUserId);
        return room;
    }

    function getChatRooms(userId = read().currentUserId) {
        const data = read();
        const eventIds = data.events.map(event => event.id);
        return clone(data.chatRooms.filter(room => room.members.includes(userId) && eventIds.includes(room.eventId)));
    }

    function getMyEventChatRooms(userId = read().currentUserId) {
        const data = read();
        const ownedEvents = data.events.filter(event => event.creatorId === userId);
        let changed = false;
        const rooms = ownedEvents.map(event => {
            let room = data.chatRooms.find(item => item.eventId === event.id);
            if (!room) {
                room = {
                    id: createId('chat-room'),
                    eventId: event.id,
                    name: `${event.title} chat`,
                    members: [],
                    messages: []
                };
                data.chatRooms.push(room);
                changed = true;
            }
            if (!room.members.includes(userId)) {
                room.members.push(userId);
                changed = true;
            }
            return room;
        });
        if (changed) write(data);
        return clone(rooms);
    }

    function getChatRoom(roomId) {
        return clone(read().chatRooms.find(room => room.id === roomId));
    }

    function sendChatMessage(roomId, text) {
        const data = read();
        const room = data.chatRooms.find(item => item.id === roomId);
        const messageText = text.trim();
        if (!room || !messageText || !room.members.includes(data.currentUserId)) return null;
        room.messages.push({
            id: createId('message'),
            userId: data.currentUserId,
            text: messageText,
            createdAt: new Date().toISOString()
        });
        write(data);
        return clone(room.messages[room.messages.length - 1]);
    }

    function getReviews(userId) {
        return clone(read().reviews.filter(review => review.targetUserId === userId));
    }

    function addReview(targetUserId, rating, text) {
        const data = read();
        if (!isAuthenticated()) return null;
        const reviewText = text.trim();
        const numericRating = Number(rating);
        if (!data.users.some(user => user.id === targetUserId) || !reviewText || numericRating < 1 || numericRating > 5) return null;
        const existingReview = data.reviews.find(review => review.targetUserId === targetUserId && review.reviewerId === data.currentUserId);
        const review = existingReview || {
            id: createId('review'),
            targetUserId,
            reviewerId: data.currentUserId,
            createdAt: new Date().toISOString()
        };
        review.rating = numericRating;
        review.text = reviewText;
        if (!existingReview) data.reviews.push(review);
        write(data);
        return clone(review);
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
        if (friendId !== data.currentUserId && data.users.some(user => user.id === friendId)) {
            const relationships = [
                { userId: data.currentUserId, friendId },
                { userId: friendId, friendId: data.currentUserId }
            ];
            relationships.forEach(relationship => {
                const alreadyFriends = data.friendships.some(friendship =>
                    friendship.userId === relationship.userId && friendship.friendId === relationship.friendId
                );
                if (!alreadyFriends) data.friendships.push({
                    id: createId('friendship'),
                    ...relationship,
                    status: 'accepted'
                });
            });
            write(data);
        }
    }

    function getFriends(userId = read().currentUserId) {
        const data = read();
        const friendIds = data.friendships
            .filter(friendship => (friendship.userId === userId || friendship.friendId === userId) && friendship.status === 'accepted')
            .map(friendship => friendship.userId === userId ? friendship.friendId : friendship.userId);
        return data.users.filter(user => friendIds.includes(user.id)).map(publicUser);
    }

    function areFriends(userId, friendId) {
        return getFriends(userId).some(user => user.id === friendId);
    }

    function getDirectMessages(userId, otherUserId) {
        const data = read();
        return clone(data.directMessages
            .filter(message =>
                (message.senderId === userId && message.recipientId === otherUserId) ||
                (message.senderId === otherUserId && message.recipientId === userId)
            )
            .sort((first, second) => first.createdAt.localeCompare(second.createdAt)));
    }

    function sendDirectMessage(recipientId, text) {
        const data = read();
        const messageText = text.trim();
        if (!messageText || !data.users.some(user => user.id === recipientId) || !areFriends(data.currentUserId, recipientId)) return null;
        const message = {
            id: createId('direct-message'),
            senderId: data.currentUserId,
            recipientId,
            text: messageText,
            createdAt: new Date().toISOString()
        };
        data.directMessages.push(message);
        write(data);
        return clone(message);
    }

    function getCreatedEvents(userId = read().currentUserId) {
        return clone(read().events.filter(event => event.creatorId === userId));
    }

    return {
        getCurrentUser,
        isAuthenticated,
        logout,
        getUsers,
        getUser,
        login,
        register,
        updateProfile,
        setPremium,
        getEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        setInterest,
        getInterestedEvents,
        getChatRooms,
        getMyEventChatRooms,
        getChatRoom,
        sendChatMessage,
        getReviews,
        addReview,
        addFriend,
        getFriends,
        getDirectMessages,
        sendDirectMessage,
        getCreatedEvents
    };
})();
