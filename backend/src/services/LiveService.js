const LiveStream = require('../models/LiveStream');
const { v4: uuidv4 } = require('uuid');

class LiveService {
    async startStream(userId, { title }) {
        // End any existing live stream
        await LiveStream.findOneAndUpdate({ user_id: userId, status: 'live' }, { status: 'ended', ended_at: new Date() });

        const streamId = uuidv4();
        const stream = await LiveStream.create({
            stream_id: streamId,
            user_id: userId,
            title: title || 'Live Video',
        });

        const rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                ...(process.env.TURN_SERVER_URL ? [{
                    urls: process.env.TURN_SERVER_URL,
                    username: process.env.TURN_USERNAME,
                    credential: process.env.TURN_CREDENTIAL,
                }] : []),
            ],
        };

        return { stream, rtc_config: rtcConfig };
    }

    async endStream(streamId, userId) {
        const stream = await LiveStream.findOne({ stream_id: streamId, user_id: userId, status: 'live' });
        if (!stream) { const err = new Error('Stream not found'); err.status = 404; throw err; }

        stream.status = 'ended';
        stream.ended_at = new Date();
        return stream.save();
    }

    async getActiveStreams(userId) {
        const Follow = require('../models/Follow');
        const followings = await Follow.find({ follower_id: userId, status: 'accepted' }).select('following_id');
        const followingIds = followings.map(f => f.following_id);

        return LiveStream.find({ user_id: { $in: followingIds }, status: 'live' })
            .populate('user_id', 'username full_name avatar_url is_verified');
    }

    async getStream(streamId) {
        const stream = await LiveStream.findOne({ stream_id: streamId })
            .populate('user_id', 'username full_name avatar_url is_verified');
        if (!stream) { const err = new Error('Stream not found'); err.status = 404; throw err; }
        return stream;
    }

    async addComment(streamId, userId, username, text) {
        const stream = await LiveStream.findOne({ stream_id: streamId, status: 'live' });
        if (!stream) return;

        // Keep last 100 comments
        if (stream.comments.length >= 100) stream.comments.shift();
        stream.comments.push({ user_id: userId, username, text, sent_at: new Date() });

        await stream.save();
        return stream.comments[stream.comments.length - 1];
    }

    async updateViewerCount(streamId, delta) {
        const stream = await LiveStream.findOneAndUpdate(
            { stream_id: streamId },
            {
                $inc: { viewer_count: delta },
                ...(delta > 0 ? { $max: { peak_viewer_count: 1 } } : {}),
            },
            { new: true },
        );
        return stream?.viewer_count || 0;
    }
}

module.exports = new LiveService();
