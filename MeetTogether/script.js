let activities = [];
let current = 0;
let currentEventId = null;
const preferencesKey = 'meetTogetherPreferences';

function eventMatchesCategory(event, category){
    if(!category) return true;
    const emoji = event.emoji || '';
    const categories = {
        social: ['☕', '🚶', '🧘'],
        sports: ['⚽', '🎾', '🏀', '🏈', '🏐', '🏸', '🏓', '🏊', '🚴', '🥾'],
        arts: ['♟️', '🏛️', '🎨', '🎭', '🎬'],
        music: ['🎵', '💃'],
        outdoors: ['🚶', '🏊', '🚴', '🥾'],
        games: ['♟️', '🎲']
    };
    return categories[category] ? categories[category].some(item => emoji.includes(item)) : true;
}

function setupEventFilters(){
    const search = document.getElementById('eventSearch');
    const date = document.getElementById('eventDateFilter');
    const category = document.getElementById('eventCategoryFilter');
    const clear = document.getElementById('clearEventFilters');
    if(!search || !date || !category || !clear) return;

    function applyFilters(){
        const query = search.value.trim().toLowerCase();
        const selectedDate = date.value;
        activities = MeetTogetherDB.getEvents().filter(event => {
            const searchableText = [event.title, event.description, event.location, event.date, event.emoji].join(' ').toLowerCase();
            const matchesQuery = !query || searchableText.includes(query);
            const matchesDate = !selectedDate || event.dateValue === selectedDate || event.date.includes(selectedDate);
            return matchesQuery && matchesDate && eventMatchesCategory(event, category.value);
        });
        current = 0;
        loadActivity();
    }

    [search, date, category].forEach(control => control.addEventListener('input', applyFilters));
    clear.addEventListener('click', function(){
        search.value = '';
        date.value = '';
        category.value = '';
        applyFilters();
    });
}

function requireAccount(){
    if(MeetTogetherDB.isAuthenticated()) return true;
    const returnPage = `${window.location.pathname.split('/').pop()}${window.location.search}`;
    window.location.href = `login.html?return=${encodeURIComponent(returnPage)}`;
    return false;
}

function setupTermsGate(){
    const page = window.location.pathname.split('/').pop().toLowerCase();
    if(localStorage.getItem('meetTogetherTermsAccepted') === 'true' || page === 'login.html' || page === 'register.html') return;
    const dialog = document.createElement('dialog');
    dialog.className = 'terms-dialog';
    dialog.innerHTML = '<h2>Terms and conditions</h2><p>Please agree to use Together Nearby respectfully. You can browse events as a guest, but an account is required to show interest, add events, join chats, or use account features.</p><label class="terms-check"><input id="termsAgreement" type="checkbox"> I agree to the terms and conditions</label><div class="dialog-actions"><button id="termsLeave" class="btn-outline" type="button">Leave</button><button id="termsAccept" class="add-btn" type="button" disabled>Continue</button></div>';
    document.body.appendChild(dialog);
    const checkbox = dialog.querySelector('#termsAgreement');
    const accept = dialog.querySelector('#termsAccept');
    checkbox.addEventListener('change', () => { accept.disabled = !checkbox.checked; });
    accept.addEventListener('click', () => { localStorage.setItem('meetTogetherTermsAccepted', 'true'); dialog.close(); dialog.remove(); });
    dialog.querySelector('#termsLeave').addEventListener('click', () => { window.location.href = 'login.html'; });
    if(typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
}

function getPreferences(){
    try{
        return JSON.parse(localStorage.getItem(preferencesKey)) || {};
    } catch(error){
        return {};
    }
}

function savePreferences(preferences){
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
}

function setupPreferences(){
    const preferences = getPreferences();
    const largeTextSetting = document.getElementById('largeTextSetting');
    const darkModeSetting = document.getElementById('darkModeSetting');
    const premiumSetting = document.getElementById('premiumSetting');
    const speechSetting = document.getElementById('speechSetting');
    const user = MeetTogetherDB.getCurrentUser();

    document.body.classList.toggle('large-text', preferences.largeText !== false);
    document.body.classList.toggle('dark-mode', preferences.darkMode === true);

    if(largeTextSetting) largeTextSetting.checked = preferences.largeText !== false;
    if(darkModeSetting) darkModeSetting.checked = preferences.darkMode === true;
    if(premiumSetting){
        premiumSetting.checked = Boolean(user && user.premium);
        premiumSetting.disabled = !MeetTogetherDB.isAuthenticated();
    }
    if(speechSetting) speechSetting.value = preferences.speech === true ? 'on' : 'off';

    [largeTextSetting, darkModeSetting, premiumSetting, speechSetting].forEach(setting => {
        if(!setting) return;
        setting.addEventListener('change', function(){
            const updatedPreferences = getPreferences();
            updatedPreferences.largeText = largeTextSetting ? largeTextSetting.checked : document.body.classList.contains('large-text');
            updatedPreferences.darkMode = darkModeSetting ? darkModeSetting.checked : document.body.classList.contains('dark-mode');
            updatedPreferences.speech = speechSetting ? speechSetting.value === 'on' : preferences.speech === true;
            document.body.classList.toggle('large-text', updatedPreferences.largeText);
            document.body.classList.toggle('dark-mode', updatedPreferences.darkMode);
            savePreferences(updatedPreferences);
            if(setting === premiumSetting) MeetTogetherDB.setPremium(premiumSetting.checked);
        });
    });
}

function setupPageTransitions(){
    const transition = document.createElement('div');
    transition.className = 'page-transition';
    transition.setAttribute('aria-hidden', 'true');
    transition.innerHTML = '<img class="page-transition-vinyl" src="../vinyl-record-loading-ezgif.com-svg-to-gif-converter.gif" alt=""><span>Loading</span>';
    document.body.appendChild(transition);

    document.addEventListener('click', function(event){
        const link = event.target.closest('a');
        if(!link || link.target === '_blank' || event.defaultPrevented) return;
        const destination = new URL(link.href, window.location.href);
        if(destination.origin !== window.location.origin || destination.href === window.location.href) return;
        const protectedPages = ['addEvent.html', 'chat.html', 'favourites.html', 'friends.html', 'profile.html'];
        if(protectedPages.includes(destination.pathname.split('/').pop()) && !MeetTogetherDB.isAuthenticated()){
            event.preventDefault();
            window.location.href = `login.html?return=${encodeURIComponent(destination.pathname.split('/').pop())}`;
            return;
        }

        event.preventDefault();
        transition.classList.add('is-visible');
        window.setTimeout(() => { window.location.href = destination.href; }, 320);
    });
}

function setupHomeMenu(){
    const menuButton = document.querySelector('.home-menu-button');
    const menu = document.querySelector('.home-menu');
    if(!menuButton || !menu) return;

    menuButton.addEventListener('click', function(){
        const isOpen = menu.classList.toggle('is-open');
        menuButton.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function(event){
        if(!event.target.closest('.home-menu-wrap')){
            menu.classList.remove('is-open');
            menuButton.setAttribute('aria-expanded', 'false');
        }
    });
}

function setupChatMenuLink(){
    const menu = document.querySelector('.home-menu');
    if(!menu || menu.querySelector('a[href="chat.html"]')) return;
    const link = document.createElement('a');
    link.href = 'chat.html';
    link.textContent = 'Chat rooms';
    menu.appendChild(link);
}

function setupLogoutLink(){
    const menu = document.querySelector('.home-menu');
    if(!menu || !MeetTogetherDB.isAuthenticated() || menu.querySelector('#logoutLink')) return;
    const link = document.createElement('a');
    link.href = '#';
    link.id = 'logoutLink';
    link.textContent = 'Log out';
    link.addEventListener('click', function(event){
        event.preventDefault();
        event.stopPropagation();
        MeetTogetherDB.logout();
        window.location.href = 'SplashPage.html';
    });
    menu.appendChild(link);
}

function setupAuthenticationVisibility(){
    if(!MeetTogetherDB.isAuthenticated()) return;
    document.querySelectorAll('a[href="login.html"], a[href="register.html"]').forEach(link => link.remove());
    const page = window.location.pathname.split('/').pop().toLowerCase();
    if(page === 'login.html' || page === 'register.html') window.location.replace('SplashPage.html');
}

function renderSavedEvents(){
    const list = document.getElementById('savedEventsList');
    if(!list) return;
    const events = MeetTogetherDB.getInterestedEvents();
    list.innerHTML = events.length ? events.map(event => `
        <article class="data-item">
            <span class="data-item-icon">${event.emoji}</span>
            <div><h2>${event.title}</h2><p>${event.description}</p><p class="item-detail">${event.location} · ${event.date}</p></div>
        </article>`).join('') : '<p class="empty-state">You have not chosen any favourite events yet.</p>';
}

function renderFriends(){
    const list = document.getElementById('friendsList');
    const suggestionsList = document.getElementById('friendSuggestionsList');
    const friends = MeetTogetherDB.getFriends();
    if(list) list.innerHTML = friends.length ? friends.map(friend => `
        <article class="data-item"><span class="avatar">${friend.name.charAt(0)}</span><div><h2>${friend.name}</h2><p>${friend.email}</p><div class="person-actions"><a class="small-action" href="organizer-profile.html?user=${encodeURIComponent(friend.id)}">View profile</a><a class="small-action message-action" href="chat.html?friend=${encodeURIComponent(friend.id)}" aria-label="Message ${friend.name}">💬 Message</a></div></div></article>`).join('') : '<p class="empty-state">You do not have any friends saved yet.</p>';

    if(suggestionsList){
        const currentUser = MeetTogetherDB.getCurrentUser();
        const friendIds = friends.map(friend => friend.id);
        const suggestions = MeetTogetherDB.getUsers().filter(user => user.id !== currentUser.id && !friendIds.includes(user.id));
        suggestionsList.innerHTML = suggestions.length ? suggestions.map(user => `
            <article class="data-item"><span class="avatar">${user.name.charAt(0)}</span><div><h2>${user.name}</h2><p>${user.email}</p><div class="person-actions"><a class="small-action" href="organizer-profile.html?user=${encodeURIComponent(user.id)}">View profile</a><button class="small-action" type="button" onclick="addFriend('${user.id}')">Add friend</button></div></div></article>`).join('') : '<p class="empty-state">You are friends with everyone in the demo.</p>';
    }
}

function addFriend(userId){
    MeetTogetherDB.addFriend(userId);
    renderFriends();
}

function renderCreatedEvents(){
    const list = document.getElementById('createdEventsList');
    if(!list) return;
    const events = MeetTogetherDB.getCreatedEvents();
    list.innerHTML = events.length ? events.map(event => `
        <article class="data-item"><span class="data-item-icon">${event.emoji}</span><div class="data-item-content"><h2>${event.title}</h2><p>${event.description}</p><p class="item-detail">${event.location} · ${event.date}</p><div class="event-actions"><a class="small-action" href="addEvent.html?edit=${encodeURIComponent(event.id)}">Edit</a><button class="small-action delete-action" type="button" data-delete-event="${event.id}">Delete</button></div></div></article>`).join('') : '<p class="empty-state">You have not created any events yet.</p>';
}

function setupCreatedEventActions(){
    const list = document.getElementById('createdEventsList');
    if(!list) return;
    list.addEventListener('click', function(event){
        const deleteButton = event.target.closest('[data-delete-event]');
        if(!deleteButton || !window.confirm('Delete this event?')) return;
        if(MeetTogetherDB.deleteEvent(deleteButton.dataset.deleteEvent)) renderCreatedEvents();
    });
}

function renderProfile(){
    const user = MeetTogetherDB.getCurrentUser();
    const name = document.getElementById('profileName');
    const email = document.getElementById('profileEmail');
    if(name) name.value = user.name;
    if(email) email.value = user.email;
}

function showFieldError(field, message){
    const error = document.getElementById(`${field.id}Error`);
    const invalid = !field.value.trim() || (field.type === 'email' && !field.validity.valid);
    field.classList.toggle('field-invalid', invalid);
    field.setAttribute('aria-invalid', String(invalid));
    if(error && message) error.textContent = message;
    if(error) error.classList.toggle('is-visible', invalid);
    return !invalid;
}

function setupStarRating(){
    const picker = document.getElementById('reviewRating');
    const value = document.getElementById('reviewRatingValue');
    if(!picker || !value) return;
    picker.addEventListener('click', function(event){
        const button = event.target.closest('[data-rating]');
        if(!button) return;
        value.value = button.dataset.rating;
        picker.querySelectorAll('.star-option').forEach(star => {
            const selected = Number(star.dataset.rating) <= Number(value.value);
            star.textContent = selected ? '★' : '☆';
            star.setAttribute('aria-checked', String(star === button));
        });
        document.getElementById('reviewRatingError').classList.remove('is-visible');
    });
}

function setupAccountForms(){
    const loginForm = document.getElementById('loginForm');
    if(loginForm) loginForm.addEventListener('submit', async function(event){
        event.preventDefault();
        const name = document.getElementById('loginName');
        const email = document.getElementById('loginEmail');
        const password = document.getElementById('loginPassword').value;
        const message = document.getElementById('loginMessage');
        const fieldsValid = showFieldError(name, 'Enter your name.') && showFieldError(email, 'Enter a valid email address.');
        if(!fieldsValid){
            if(password.length < 8){
                document.getElementById('loginPasswordError').classList.add('is-visible');
                message.textContent = 'Password must be at least 8 characters.';
            }
            else message.textContent = 'Complete the highlighted fields.';
            message.classList.add('is-visible');
            return;
        }
        const result = await MeetTogetherDB.login(document.getElementById('loginName').value, document.getElementById('loginEmail').value, password);
        if(!result.user){
            message.textContent = 'Email or password is incorrect.';
            message.classList.add('is-visible');
            return;
        }
        const returnPage = new URLSearchParams(window.location.search).get('return');
        window.location.href = returnPage || 'SplashPage.html';
    });

    const registerForm = document.getElementById('registerForm');
    if(registerForm) registerForm.addEventListener('submit', async function(event){
        event.preventDefault();
        const name = document.getElementById('registerName');
        const email = document.getElementById('registerEmail');
        const phone = document.getElementById('registerPhone');
        const password = document.getElementById('registerPassword').value;
        const confirmation = document.getElementById('registerPasswordConfirm').value;
        const message = document.getElementById('registerMessage');
        const fieldsValid = [
            showFieldError(name, 'Enter your name.'),
            showFieldError(email, 'Enter a valid email address.'),
            showFieldError(phone, 'Enter your phone number.')
        ].every(Boolean);
        if(!fieldsValid || password.length < 8){
            document.getElementById('registerPasswordError').classList.toggle('is-visible', password.length < 8);
            message.textContent = !fieldsValid ? 'Complete the highlighted fields.' : 'Password must be at least 8 characters.';
            message.classList.add('is-visible');
            return;
        }
        if(password !== confirmation){
            document.getElementById('registerPasswordConfirm').classList.add('field-invalid');
            document.getElementById('registerPasswordConfirmError').classList.add('is-visible');
            message.textContent = 'Passwords do not match.';
            message.classList.add('is-visible');
            return;
        }
        const result = await MeetTogetherDB.register(
            name.value,
            email.value,
            phone.value,
            password
        );
        if(!result.user){
            message.textContent = 'An account with that email already exists.';
            message.classList.add('is-visible');
            return;
        }
        const returnPage = new URLSearchParams(window.location.search).get('return');
        window.location.href = returnPage || 'SplashPage.html';
    });

    const profileForm = document.getElementById('profileForm');
    if(profileForm) profileForm.addEventListener('submit', async function(event){
        event.preventDefault();
        const name = document.getElementById('profileName');
        const email = document.getElementById('profileEmail');
        const password = document.getElementById('profilePassword');
        const message = document.getElementById('profileMessage');
        const fieldsValid = [
            showFieldError(name, 'Enter your name.'),
            showFieldError(email, 'Enter a valid email address.'),
            showFieldError(password, 'Enter your current password.')
        ].every(Boolean);
        if(!fieldsValid){
            message.textContent = 'Complete the highlighted fields.';
            return;
        }
        const result = await MeetTogetherDB.updateProfile({
            name: name.value,
            email: email.value,
            currentPassword: password.value
        });
        if(result.user){
            message.textContent = 'Your profile has been saved.';
        }else if(result.error === 'email-in-use'){
            message.textContent = 'That email is already in use.';
        }else{
            password.classList.add('field-invalid');
            message.textContent = 'Current password is incorrect.';
        }
    });
}

function loadActivity(){

    const card = document.querySelector('.card');
    const buttons = document.querySelector('.buttons');
    if(activities.length && card && !document.getElementById('title')){
        card.innerHTML = '<div class="card-header"><span id="activityEmoji" class="emoji">☕</span><h2 id="title"></h2></div><p id="description"></p><p id="location"></p><p id="date"></p><p id="organizer" class="event-organizer"></p>';
    }

    if(current >= activities.length){

        card.innerHTML =
        activities.length ? "<h2>🎉 You've seen every activity!</h2>" : "<h2>No activities match your filters.</h2>";

        buttons.style.display="none";

        return;
    }

    buttons.style.display = 'flex';

    const a = activities[current];
    currentEventId = a.id;

    const emojiEl = document.getElementById('activityEmoji');
        const organizerEl = document.getElementById('organizer');
    if(emojiEl) emojiEl.textContent = a.emoji || '';
    document.getElementById('title').textContent = a.title;
    document.getElementById('description').textContent = a.description;
    document.getElementById('location').textContent = a.location;
    document.getElementById('date').textContent = a.date;
    if(organizerEl){
        const organizer = MeetTogetherDB.getUser(a.creatorId);
        organizerEl.innerHTML = organizer ? `👤 Organised by <a class="organiser-link" href="organizer-profile.html?user=${encodeURIComponent(organizer.id)}">${organizer.name}</a>` : '';
    }
    if(getPreferences().speech === true && 'speechSynthesis' in window){
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${a.title}. ${a.description}. ${a.location}. ${a.date}.`));
    }

}

function likeActivity(){
    if(!requireAccount()) return;
    if(currentEventId) MeetTogetherDB.setInterest(currentEventId);
    showInterestDialog(currentEventId);

}

function showInterestDialog(eventId){
    const dialog = document.getElementById('interestDialog');
    if(!dialog || !eventId){
        current++;
        loadActivity();
        return;
    }
    dialog.dataset.eventId = eventId;
    if(typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
}

function continueBrowsing(){
    const dialog = document.getElementById('interestDialog');
    if(dialog) dialog.close();
    current++;
    loadActivity();
}

function openInterestChat(){
    const dialog = document.getElementById('interestDialog');
    const eventId = dialog ? dialog.dataset.eventId : '';
    if(dialog) dialog.close();
    window.location.href = `chat.html?event=${encodeURIComponent(eventId)}`;
}

function setupInterestDialog(){
    const dialog = document.getElementById('interestDialog');
    if(!dialog) return;
    const continueButton = document.getElementById('continueBrowsingButton');
    const chatButton = document.getElementById('openChatButton');
    if(continueButton) continueButton.addEventListener('click', continueBrowsing);
    if(chatButton) chatButton.addEventListener('click', openInterestChat);
}

function renderOrganizerProfile(){
    const nameEl = document.getElementById('organiserName');
    const emailEl = document.getElementById('organiserEmail');
    const avatarEl = document.getElementById('organiserAvatar');
    const eventsEl = document.getElementById('organiserEvents');
    const reviewsEl = document.getElementById('organiserReviews');
    const form = document.getElementById('reviewForm');
    if(!nameEl || !eventsEl || !reviewsEl || !form) return;

    const userId = new URLSearchParams(window.location.search).get('user');
    const user = MeetTogetherDB.getUser(userId);
    if(!user){
        nameEl.textContent = 'Organiser not found';
        form.hidden = true;
        return;
    }

    nameEl.textContent = user.name;
    emailEl.textContent = user.email;
    avatarEl.textContent = user.name.charAt(0).toUpperCase();
    const events = MeetTogetherDB.getEvents().filter(event => event.creatorId === user.id);
    eventsEl.innerHTML = events.length ? events.map(event => `<article class="data-item"><span class="data-item-icon">${event.emoji}</span><div><h3>${event.title}</h3><p>${event.description}</p><p class="item-detail">${event.location} · ${event.date}</p></div></article>`).join('') : '<p class="empty-state">No events created yet.</p>';

    function renderReviews(){
        const reviews = MeetTogetherDB.getReviews(user.id);
        reviewsEl.innerHTML = reviews.length ? reviews.map(review => {
            const reviewer = MeetTogetherDB.getUser(review.reviewerId);
            return `<article class="review-item"><strong>${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</strong><p>${review.text}</p><small>Reviewed by ${reviewer ? reviewer.name : 'A member'}</small></article>`;
        }).join('') : '<p class="empty-state">No reviews yet.</p>';
    }

    form.addEventListener('submit', function(event){
        event.preventDefault();
        const rating = document.getElementById('reviewRatingValue');
        const text = document.getElementById('reviewText');
        const ratingError = document.getElementById('reviewRatingError');
        const textValid = showFieldError(text, 'Enter a review.');
        const ratingValid = Boolean(rating.value);
        ratingError.classList.toggle('is-visible', !ratingValid);
        if(!textValid || !ratingValid) return;
        MeetTogetherDB.addReview(user.id, rating.value, text.value);
        text.value = '';
        rating.value = '';
        document.querySelectorAll('.star-option').forEach(star => { star.textContent = '☆'; star.setAttribute('aria-checked', 'false'); });
        document.getElementById('reviewMessage').textContent = 'Your review has been posted.';
        renderReviews();
    });
    setupStarRating();
    renderReviews();
}

function renderChatPage(){
    const roomList = document.getElementById('chatRoomList');
    const myEventChatList = document.getElementById('myEventChatList');
    const directFriendList = document.getElementById('directFriendList');
    const messages = document.getElementById('chatMessages');
    const form = document.getElementById('chatForm');
    const directForm = document.getElementById('directMessageForm');
    if(!roomList || !myEventChatList || !messages || !form || !directFriendList || !directForm) return;
    if(!requireAccount()) return;

    const rooms = MeetTogetherDB.getChatRooms();
    const myEventRooms = MeetTogetherDB.getMyEventChatRooms();
    const events = MeetTogetherDB.getEvents();
    const friends = MeetTogetherDB.getFriends();
    const requestedEvent = new URLSearchParams(window.location.search).get('event');
    const requestedFriend = new URLSearchParams(window.location.search).get('friend');
    let activeRoom = rooms.find(room => room.eventId === requestedEvent) || myEventRooms.find(room => room.eventId === requestedEvent) || rooms[0] || myEventRooms[0];
    let activeEvent = activeRoom && events.find(event => event.id === activeRoom.eventId);
    let activeFriendId = friends.some(friend => friend.id === requestedFriend) ? requestedFriend : null;

    roomList.innerHTML = rooms.length ? rooms.map(room => {
        const event = events.find(item => item.id === room.eventId);
        return `<button class="chat-room-option${activeRoom && activeRoom.id === room.id ? ' selected' : ''}" type="button" data-room-id="${room.id}"><span class="chat-room-emoji">${event ? event.emoji : '💬'}</span><span>${event ? event.title : room.name}</span></button>`;
    }).join('') : '<p class="empty-state">Show interest in an event to join its chat room.</p>';
    myEventChatList.innerHTML = myEventRooms.length ? myEventRooms.map(room => {
        const event = events.find(item => item.id === room.eventId);
        return `<button class="chat-room-option${activeRoom && activeRoom.id === room.id ? ' selected' : ''}" type="button" data-my-event-room-id="${room.id}"><span class="chat-room-emoji">${event ? event.emoji : '💬'}</span><span>${event ? event.title : room.name}</span></button>`;
    }).join('') : '<p class="empty-state">Create an event to see its chat here.</p>';
    directFriendList.innerHTML = friends.length ? friends.map(friend =>
        `<button class="chat-room-option${activeFriendId === friend.id ? ' selected' : ''}" type="button" data-direct-user="${friend.id}"><span class="chat-room-emoji">💬</span><span>${friend.name}</span></button>`
    ).join('') : '<p class="empty-state">Add a friend to start a direct message.</p>';

    function renderMessages(){
        const meta = document.getElementById('chatRoomMeta');
        if(activeFriendId){
            const friend = friends.find(item => item.id === activeFriendId);
            const directMessages = MeetTogetherDB.getDirectMessages(MeetTogetherDB.getCurrentUser().id, activeFriendId);
            document.getElementById('chatRoomTitle').textContent = `💬 ${friend.name}`;
            if(meta) meta.textContent = 'Direct messages';
            messages.innerHTML = directMessages.length ? directMessages.map(message => {
                const user = MeetTogetherDB.getUser(message.senderId);
                return `<article class="chat-message"><strong>${user ? user.name : 'Member'}</strong><p>${message.text}</p></article>`;
            }).join('') : '<p class="empty-state">No messages yet. Start the conversation.</p>';
            form.hidden = true;
            directForm.hidden = false;
            return;
        }
        if(activeRoom) activeRoom = MeetTogetherDB.getChatRoom(activeRoom.id);
        messages.innerHTML = activeRoom && activeRoom.messages.length ? activeRoom.messages.map(message => {
            const user = MeetTogetherDB.getUser(message.userId);
            return `<article class="chat-message"><strong>${user ? user.name : 'Member'}</strong><p>${message.text}</p></article>`;
        }).join('') : '<p class="empty-state">No messages yet. Start the conversation.</p>';
        if(activeEvent && meta){
            const organizer = MeetTogetherDB.getUser(activeEvent.creatorId);
            document.getElementById('chatRoomTitle').textContent = `${activeEvent.emoji} ${activeEvent.title} chat`;
            meta.innerHTML = organizer ? `<span>Organised by</span> <a href="organizer-profile.html?user=${encodeURIComponent(organizer.id)}" class="organiser-link">👤 ${organizer.name}</a>` : '';
        }
        form.hidden = false;
        directForm.hidden = true;
    }

    roomList.addEventListener('click', function(event){
        const button = event.target.closest('[data-room-id]');
        if(!button) return;
        activeRoom = MeetTogetherDB.getChatRoom(button.dataset.roomId);
        activeEvent = events.find(item => item.id === activeRoom.eventId);
        activeFriendId = null;
        directFriendList.querySelectorAll('.chat-room-option').forEach(item => item.classList.remove('selected'));
        myEventChatList.querySelectorAll('.chat-room-option').forEach(item => item.classList.remove('selected'));
        roomList.querySelectorAll('.chat-room-option').forEach(item => item.classList.toggle('selected', item === button));
        renderMessages();
    });

    myEventChatList.addEventListener('click', function(event){
        const button = event.target.closest('[data-my-event-room-id]');
        if(!button) return;
        activeRoom = MeetTogetherDB.getChatRoom(button.dataset.myEventRoomId);
        activeEvent = events.find(item => item.id === activeRoom.eventId);
        activeFriendId = null;
        directFriendList.querySelectorAll('.chat-room-option').forEach(item => item.classList.remove('selected'));
        roomList.querySelectorAll('.chat-room-option').forEach(item => item.classList.remove('selected'));
        myEventChatList.querySelectorAll('.chat-room-option').forEach(item => item.classList.toggle('selected', item === button));
        renderMessages();
    });

    directFriendList.addEventListener('click', function(event){
        const button = event.target.closest('[data-direct-user]');
        if(!button) return;
        activeFriendId = button.dataset.directUser;
        directFriendList.querySelectorAll('.chat-room-option').forEach(item => item.classList.toggle('selected', item === button));
        roomList.querySelectorAll('.chat-room-option').forEach(item => item.classList.remove('selected'));
        myEventChatList.querySelectorAll('.chat-room-option').forEach(item => item.classList.remove('selected'));
        renderMessages();
    });

    form.addEventListener('submit', function(event){
        event.preventDefault();
        const input = document.getElementById('chatMessageInput');
        if(activeRoom && input.value.trim()){
            MeetTogetherDB.sendChatMessage(activeRoom.id, input.value);
            input.value = '';
            renderMessages();
        }
    });
    directForm.addEventListener('submit', function(event){
        event.preventDefault();
        const input = document.getElementById('directMessageInput');
        if(activeFriendId && input.value.trim()){
            MeetTogetherDB.sendDirectMessage(activeFriendId, input.value);
            input.value = '';
            renderMessages();
        }
    });
    renderMessages();
}

function skipActivity(){

    current++;

    loadActivity();

}

function setupEventDateTimeFields(){
    const dateEl = document.getElementById('eventDate');
    const timeEl = document.getElementById('eventTime');
    if(!dateEl || !timeEl) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateEl.min = `${year}-${month}-${day}`;
    timeEl.addEventListener('blur', function(){
        timeEl.value = timeEl.value.trim().replace('.', ':');
    });
}

function validateRequiredField(field){
    const error = document.getElementById(`${field.id}Error`);
    const isMissing = !field.value.trim();
    field.classList.toggle('field-invalid', isMissing);
    field.setAttribute('aria-invalid', String(isMissing));
    if(error) error.classList.toggle('is-visible', isMissing);
    return !isMissing;
}

function validateTimeField(field){
    const error = document.getElementById(`${field.id}Error`);
    const normalizedValue = field.value.trim().replace('.', ':');
    const isValid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalizedValue);
    field.classList.toggle('field-invalid', !isValid);
    field.setAttribute('aria-invalid', String(!isValid));
    if(error){
        error.textContent = field.value.trim() ? 'Use HH:MM or HH.MM.' : 'Field is required.';
        error.classList.toggle('is-visible', !isValid);
    }
    return isValid;
}

function setupEventEditMode(){
    const form = document.getElementById('addEventForm');
    if(!form) return;
    const eventId = new URLSearchParams(window.location.search).get('edit');
    if(!eventId) return;
    const currentUser = MeetTogetherDB.getCurrentUser();
    const event = MeetTogetherDB.getEvents().find(item => currentUser && item.id === eventId && item.creatorId === currentUser.id);
    if(!event) return;

    const heading = document.getElementById('eventFormHeading');
    const subtitle = document.getElementById('eventFormSubtitle');
    const submit = document.getElementById('eventSubmitButton');
    if(heading) heading.textContent = 'Edit Event';
    if(subtitle) subtitle.textContent = 'Update your activity details';
    if(submit) submit.textContent = 'Save Changes';
    document.getElementById('eventTitle').value = event.title;
    document.getElementById('eventDescription').value = event.description;
    document.getElementById('eventLocation').value = event.location;
    document.getElementById('eventEmoji').value = event.emoji || '';
    let dateValue = event.dateValue || '';
    let timeValue = event.timeValue || '';
    if(!dateValue && event.date){
        const parts = event.date.split(' at ');
        const parsedDate = new Date(parts[0].replace(/^[^A-Za-z]*/, ''));
        if(!Number.isNaN(parsedDate.getTime())) dateValue = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
        timeValue = parts[1] || '';
    }
    document.getElementById('eventDate').value = dateValue;
    document.getElementById('eventTime').value = timeValue;
    document.querySelectorAll('.emoji-option').forEach(button => button.classList.toggle('selected', button.dataset.emoji === event.emoji));
    form.dataset.editEventId = event.id;
}

function addEvent(e){
    e.preventDefault();
    if(!requireAccount()) return;

    const titleEl = document.getElementById('eventTitle');
    const descEl = document.getElementById('eventDescription');
    const locEl = document.getElementById('eventLocation');
    const dateEl = document.getElementById('eventDate');
    const timeEl = document.getElementById('eventTime');
    const imgEl = document.getElementById('eventEmoji');
    const requiredFields = [titleEl, descEl, locEl, dateEl, timeEl];
    const requiredFieldsValid = requiredFields.map(validateRequiredField).every(Boolean);
    const timeIsValid = validateTimeField(timeEl);

    if(!requiredFieldsValid || !timeIsValid){
        (requiredFields.find(field => !field.value.trim()) || timeEl).focus();
        return;
    }

    timeEl.value = timeEl.value.trim().replace('.', ':');

    const eventDetails = {
        title: titleEl.value.trim(),
        description: descEl.value.trim(),
        location: locEl.value.trim(),
        date: `${new Date(`${dateEl.value}T12:00:00`).toLocaleDateString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
        })} at ${timeEl.value}`,
        dateValue: dateEl.value,
        timeValue: timeEl.value,
        emoji: imgEl.value || '📌'
    };

    const savedEvent = e.target.dataset.editEventId
        ? MeetTogetherDB.updateEvent(e.target.dataset.editEventId, eventDetails)
        : MeetTogetherDB.createEvent(eventDetails);
    if(!savedEvent){
        const msg = document.getElementById('addMessage');
        if(msg) msg.textContent = e.target.dataset.editEventId ? 'This event could not be updated.' : 'Your account has reached its event limit. Premium accounts can create up to 20 events.';
        return;
    }

    const msg = document.getElementById('addMessage');
    if(msg){
        msg.textContent = e.target.dataset.editEventId ? 'Event updated — returning...' : 'Event saved — returning...';
    }

    // reset then go back to index
    e.target.reset();
    setTimeout(()=> window.location.href = 'index.html', 700);
}

window.onload = function(){
    setupTermsGate();
    setupPreferences();
    setupPageTransitions();
    setupHomeMenu();
    setupChatMenuLink();
    setupAuthenticationVisibility();
    setupLogoutLink();
    setupInterestDialog();
    renderOrganizerProfile();
    renderSavedEvents();
    renderFriends();
    renderCreatedEvents();
    setupCreatedEventActions();
    renderProfile();
    setupAccountForms();
    setupEventDateTimeFields();
    setupEventEditMode();
    renderChatPage();
    const currentPage = window.location.pathname.split('/').pop();
    if(['addEvent.html', 'favourites.html', 'friends.html', 'profile.html'].includes(currentPage) && !MeetTogetherDB.isAuthenticated()) requireAccount();

    // If we're on the index page (activity elements present), merge stored events and load
    const activityImageEl = document.getElementById('activityEmoji') || document.getElementById('title');
    const form = document.getElementById('addEventForm');

    if(activityImageEl){
        activities = MeetTogetherDB.getEvents();
        setupEventFilters();
        loadActivity();
    }

    if(form) form.addEventListener('submit', addEvent);
    // emoji picker wiring
    const picker = document.getElementById('emojiPicker');
    const hidden = document.getElementById('eventEmoji');
    if(picker && hidden){
        picker.addEventListener('click', function(ev){
            const btn = ev.target.closest('button');
            if(!btn) return;
            if(btn.classList.contains('emoji-clear')){
                hidden.value = '';
                // remove selected
                picker.querySelectorAll('.emoji-option.selected').forEach(n=>n.classList.remove('selected'));
                return;
            }
            if(btn.classList.contains('emoji-option')){
                const val = btn.getAttribute('data-emoji') || btn.textContent.trim();
                hidden.value = val;
                // update selected state
                picker.querySelectorAll('.emoji-option.selected').forEach(n=>n.classList.remove('selected'));
                btn.classList.add('selected');
            }
        });
    }
}