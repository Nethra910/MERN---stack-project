import Call from '../models/Call.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';

// GET /api/calls/history
export const getCallHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const calls = await Call.find({
      $or: [{ caller: userId }, { receiver: userId }],
    })
      .populate('caller', 'name avatar username')
      .populate('receiver', 'name avatar username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Call.countDocuments({
      $or: [{ caller: userId }, { receiver: userId }],
    });

    return res.status(200).json(
      new ApiResponse(200, {
        calls,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      }, 'Call history fetched')
    );
  } catch (err) {
    next(err);
  }
};

// GET /api/calls/missed-count
export const getMissedCallCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const count = await Call.countDocuments({
      receiver: userId,
      status: 'missed',
      // Only count missed calls in the last 24h as "new"
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    return res.status(200).json(new ApiResponse(200, { count }, 'Missed call count'));
  } catch (err) {
    next(err);
  }
};

// DELETE /api/calls/:callId
export const deleteCallRecord = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const call = await Call.findOne({
      _id: req.params.callId,
      $or: [{ caller: userId }, { receiver: userId }],
    });
    if (!call) throw new ApiError(404, 'Call record not found');
    await call.deleteOne();
    return res.status(200).json(new ApiResponse(200, {}, 'Call record deleted'));
  } catch (err) {
    next(err);
  }
};